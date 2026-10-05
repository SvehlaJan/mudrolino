"""Run sequential Blender and production-browser gates for one catalog piece."""
import argparse,ast,json,subprocess,sys
from pathlib import Path
from blender_cli import script_command

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--id',required=True);p.add_argument('--garment',required=True);p.add_argument('--outfit',required=True)
    p.add_argument('--head-check',action='store_true')
    p.add_argument('--coverage-opening-z',type=float)
    p.add_argument('--coverage-margin',type=float,default=.004)
    p.add_argument('--detail-anchor-attribute');p.add_argument('--require-detail-clear',action='store_true')
    p.add_argument('--surface-material',action='append',default=[]);p.add_argument('--detail-material',action='append',default=[])
    a=p.parse_args();ids=a.outfit.split('-')
    assert a.id in ids and len(ids)==len(set(ids)) and all(id.isalnum() and id.isupper() for id in ids)
    module=ast.parse(Path('tools/blender/catalog/assemble_catalog_outfit.py').read_text())
    names=next(ast.literal_eval(node.value) for node in module.body if isinstance(node,ast.Assign) and any(isinstance(target,ast.Name) and target.id=='OBJECT_NAMES' for target in node.targets))
    assert all(id in names for id in ids),ids
    base=Path('assets/avatar/catalog-a');piece=base/a.id;outfit=base/'outfits'/a.outfit
    review=Path('artifacts/verification/avatar-catalog/outfits')/a.outfit;review.mkdir(parents=True,exist_ok=True)
    def run(stage,command):
        print('START',a.id,stage,flush=True)
        with (review/(stage+'.log')).open('w') as log:
            result=subprocess.run([str(x) for x in command],stdout=log,stderr=subprocess.STDOUT)
        if result.returncode:
            print('FAILED',stage,'see',review/(stage+'.log'),flush=True);sys.exit(result.returncode)
        print('PASS',a.id,stage,flush=True)
    def blend(stage,script,args):run(stage,script_command('tools/blender/catalog/'+script,args))
    common=['--body','body_underlayer_male,H01_head','--substeps','4','--require-clear','--target-z','.92','--ortho-scale','2.10']
    blend('independent-motion','review_catalog_motion.py',['--blend',piece/(a.id+'.blend'),'--garment',a.garment,*common,'--output-dir',piece,'--review-dir',Path('artifacts/verification/avatar-catalog')/a.id])
    coverage=None
    if a.coverage_opening_z is not None:
        blend('opening-coverage','verify_catalog_coverage.py',['--blend',piece/(a.id+'.blend'),'--id',a.id,'--opening-z',str(a.coverage_opening_z),'--margin',str(a.coverage_margin),'--report',piece/'body-coverage-report.json'])
        coverage=a.id+'/body-coverage-report.json'
    detail=None
    if a.detail_material:
        assert a.surface_material
        args=['--blend',piece/(a.id+'.blend'),'--garment',a.garment,'--report',piece/'detail-fit-report.json']
        for name in a.surface_material:args+=['--surface-material',name]
        for name in a.detail_material:args+=['--detail-material',name]
        if a.detail_anchor_attribute:args+=['--anchor-attribute',a.detail_anchor_attribute]
        if a.require_detail_clear:args+=['--require-detail-clear']
        blend('stitched-details','verify_catalog_details.py',args);detail=a.id+'/detail-fit-report.json'
    blend('assembly','assemble_catalog_outfit.py',['--foundation',base/'foundation/catalog-body.blend','--catalog-dir',base,'--pieces',','.join(ids),'--output-dir',outfit,'--review-dir',review])
    objects=[names[id]+'_outfit' for id in ids]
    side_args=[]
    for id in ids:side_args+=['--blend',base/id/(id+'.blend')]
    side_args+=['--blend',outfit/'outfit.blend','--report',outfit/'corrective-side-report.json','--require-clear']
    blend('corrective-sides','verify_catalog_corrective_sides.py',side_args)
    blend('outfit-motion','review_catalog_motion.py',['--blend',outfit/'outfit.blend','--garment',','.join(objects),*common,'--output-dir',outfit,'--review-dir',review])
    blend('export-deformation','verify_catalog_outfit_export.py',['--blend',outfit/'outfit.blend','--glb',outfit/'outfit.glb','--report',outfit/'export-deformation-report.json'])
    deformation=json.loads((outfit/'export-deformation-report.json').read_text());corrective=None
    if any(any(row.get('corrective_values',{}).values()) for row in deformation['checks']):
        run('runtime-correctives',['node_modules/.bin/tsx','tools/avatar/verify_catalog_correctives.ts','--outfit='+a.outfit])
        corrective='outfits/'+a.outfit+'/runtime-corrective-report.json'
    attachments=[]
    if a.head_check:
        blend('head-clearance','verify_catalog_attachment.py',['--blend',outfit/'outfit.blend','--object','H01_head','--bone','Head','--obstacles',names[a.id]+'_outfit','--report',piece/'head-clearance-report.json'])
        attachments.append(a.id+'/head-clearance-report.json')
    if 'A01' in ids:
        cap=names['A01']+'_outfit'
        blend('cap-attachment','verify_catalog_attachment.py',['--blend',outfit/'outfit.blend','--object',cap,'--bone','Head','--obstacles',','.join(['H01_head',*[name for name in objects if name!=cap]]),'--report',outfit/'cap-attachment-report.json'])
        attachments.append('outfits/'+a.outfit+'/cap-attachment-report.json')
    run('export-validation',['node','tools/avatar/verify_catalog_exports.mjs','--outfit='+a.outfit])
    run('export-materials',['node','tools/blender/catalog/verify_exported_materials.mjs',outfit/'outfit.glb',outfit/'material-export-report.json'])
    run('production-browser',['node','tools/avatar/verify_catalog_preview.mjs','--outfit='+a.outfit,'--production'])
    args=[sys.executable,'tools/avatar/summarize_catalog_proof.py','--outfit='+a.outfit]
    for attachment in attachments:args+=['--attachment='+attachment]
    if detail:args+=['--detail='+detail]
    if corrective:args+=['--corrective='+corrective]
    if coverage:args+=['--coverage='+coverage]
    run('proof-summary',args)
    print('VERIFIED_CANDIDATE',a.id,'final style/budget/runtime registration remain pending',flush=True)

if __name__=='__main__':main()
