"""Plan fresh dependent checks without rebuilding the preserved cuff candidate."""
import json
import sys
from pathlib import Path

REVISION = Path('assets/avatar/catalog-a/B04/fitting-revisions/independent-keys-repair/bilateral-targets-2026-10-07/cuff-construction-v1/export-compatible-candidate')
RECIPES = (('T01-B04-F01', ('T01','B04','F01'), ('T01_crew_tee_outfit','B04_ivory_trousers_outfit','F01_strap_sneakers_outfit')),
           ('T04-B04-F03', ('T04','B04','F03'), ('T04_zip_hoodie_outfit','B04_ivory_trousers_outfit','F03_high_tops_outfit')))


def verification_plan(revision, output):
    revision, output = Path(revision), Path(output)
    if revision.resolve() != REVISION.resolve() or not output.resolve().is_relative_to(revision.resolve()) or output.resolve() == revision.resolve():
        raise ValueError('Separate proof folder beneath the preserved cuff candidate required')
    result = []
    def add(name, kind, script, args): result.append({'name':name,'kind':kind,'script':script,'args':list(map(str,args))})
    def sides(name, source, dest): add(name+'-sides','blender','verify_catalog_corrective_sides.py',['--blend',source,'--report',dest/'corrective-side-report.json','--require-clear'])
    def motion(name, source, garment, dest, height, scale):
        add(name+'-motion','blender','review_catalog_motion.py',['--blend',source,'--garment',garment,'--body','body_underlayer_male,H01_head','--substeps','4','--require-clear','--target-z',height,'--ortho-scale',scale,'--output-dir',dest,'--review-dir',dest/'review'])
    def details(name, source, garment, dest):
        add(name+'-details','blender','verify_catalog_details.py',['--blend',source,'--garment',garment,
            '--surface-material','A ivory tapered trouser fabric','--surface-material','A ivory tapered trouser trim',
            '--detail-material','A ivory tapered trouser pockets and seams','--detail-material','A navy tapered trouser button',
            '--threshold','.012','--require-detail-clear','--report',dest/'detail-own-shell-report.json'])
    source = revision/'B04.blend'; independent = output/'independent'
    sides('independent',source,independent); motion('independent',source,'B04_ivory_trousers',independent,'.53','1.2'); details('independent',source,'B04_ivory_trousers',independent)
    for name,pieces,garments in RECIPES:
        dest = output/'outfits'/name; blend = dest/'outfit.blend'
        add(name+'-assembly','blender','assemble_catalog_outfit.py',['--foundation','assets/avatar/catalog-a/foundation/catalog-body.blend','--catalog-dir',output/'staged-catalog','--pieces',','.join(pieces),'--output-dir',dest,'--review-dir',dest/'review'])
        sides(name,blend,dest); motion(name,blend,','.join(garments),dest,'.92','2.10'); details(name,blend,'B04_ivory_trousers_outfit',dest)
        add(name+'-export','blender','verify_catalog_outfit_export.py',['--blend',blend,'--glb',dest/'outfit.glb','--report',dest/'export-deformation-report.json'])
        add(name+'-runtime','tsx','tools/avatar/verify_catalog_correctives.ts',['--outfit='+name,'--outfit-dir='+str(dest)])
        add(name+'-materials','node','tools/blender/catalog/verify_exported_materials.mjs',[dest/'outfit.glb',dest/'material-export-report.json'])
        for asset in ('body.glb','garments.glb','outfit.glb'): add(name+'-validate-'+asset,'node','tools/avatar/validate_gltf.js',[dest/asset])
    for asset in ('B04.glb','body-B04.glb'): add('independent-validate-'+asset,'node','tools/avatar/validate_gltf.js',[revision/asset])
    return result


if __name__ == '__main__': print(json.dumps(verification_plan(**json.load(sys.stdin))))
