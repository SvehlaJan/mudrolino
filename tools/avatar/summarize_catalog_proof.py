"""Consolidate current fitting/export/browser evidence; reject stale hashes."""
import argparse
import hashlib
import json
from pathlib import Path

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def read(path):
    return json.loads(path.read_text())

def require(condition,message):
    if not condition:
        raise ValueError(message)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--outfit',required=True)
    parser.add_argument('--attachment',action='append',default=[],help='Attachment/head-clearance JSON, relative to catalog root')
    parser.add_argument('--detail',action='append',default=[],help='Stitched-detail distance JSON, relative to catalog root')
    parser.add_argument('--corrective',help='Three.js corrective-shape JSON, relative to catalog root')
    parser.add_argument('--coverage',action='append',default=[],help='Opening-anatomy coverage JSON, relative to catalog root')
    args=parser.parse_args()
    pieces=args.outfit.split('-')
    require(all(id.isalnum() and id.isupper() for id in pieces),'Invalid outfit ID')
    catalog=Path('assets/avatar/catalog-a');outfit=catalog/'outfits'/args.outfit
    artifacts=Path('artifacts/verification/avatar-catalog/outfits')/args.outfit
    motion={}
    for relative in pieces+['outfits/'+args.outfit]:
        meta=read(catalog/relative/'motion-sweep-4x-metadata.json')
        require(digest(Path(meta['blend']))==meta['blend_sha256'],'Stale motion source: '+relative)
        require(meta['substeps']==4 and meta['samples']==163,'Incomplete motion sweep: '+relative)
        require(meta['max_body_pairs']==meta['max_layer_pairs']==0,'Motion contacts remain: '+relative)
        require(set(meta['body_meshes'])=={'body_underlayer_male','H01_head'},'Missing body/head obstacle: '+relative)
        motion[relative]=meta
    source_hash=digest(outfit/'outfit.blend')
    validation=read(artifacts/'export-validation.json')
    require(len(validation)==7+2*len(pieces),'Wrong export inventory size')
    for entry in validation:
        require(digest(Path(entry['file']))==entry['sha256'],'Stale export validation: '+entry['file'])
        require(all(entry['issues'][k]==0 for k in ['numErrors','numWarnings','numInfos','numHints']),'Export issues: '+entry['file'])
    deformation=read(outfit/'export-deformation-report.json')
    require(deformation['status']=='passed' and len(deformation['checks'])>=15,'Incomplete deformation comparison')
    require(any(row['motion']=='run' and row['frame']==7.25 for row in deformation['checks']),'Missing deepest-kick export regression')
    if 'F04' in pieces:require(any(row['motion']=='run' and row['frame']==15.25 for row in deformation['checks']),'Missing left-loop export regression')
    require(digest(Path(deformation['glb']))==deformation['glb_sha256'],'Stale deformation GLB')
    require(Path(deformation['blend'])==outfit/'outfit.blend','Wrong deformation source')
    require(deformation.get('blend_sha256')==source_hash,'Stale deformation master')
    require(deformation.get('comparison')=='bidirectional rendered vertex distance','Incomplete geometry comparison')
    corrective=None;side_proof=None
    if any(any(row.get('corrective_values',{}).values()) for row in deformation['checks']):
        side_proof=read(outfit/'corrective-side-report.json')
        require(side_proof['status']=='passed','Corrective moves the opposite side')
        require({row['blend'] for row in side_proof['checks']}=={meta['blend'] for meta in motion.values()},'Incomplete corrective-side sources')
        for row in side_proof['checks']:
            require(digest(Path(row['blend']))==row['blend_sha256'],'Stale corrective-side source')
            require(row['status']=='passed' and all(k['opposite_vertices_moved']==0 and k['max_opposite_delta_m']<=side_proof['tolerance_m'] for k in row['keys']),'Corrective moves the opposite side')
        require(0<side_proof['tolerance_m']<=1e-6,'Invalid corrective-side tolerance')
        require(args.corrective,'Missing Three.js corrective proof')
        corrective=read(catalog/args.corrective)
        require(corrective['status']=='passed' and len(corrective['checks'])>=15,'Incomplete corrective proof')
        require(any(row['motion']=='run' and row['frame']==7.25 for row in corrective['checks']),'Missing deepest-kick corrective regression')
        require({(r['motion'],r['frame']) for r in corrective['checks']}=={(r['motion'],r['frame']) for r in deformation['checks']},'Corrective/export pose coverage differs')
        if 'F04' in pieces:require(any(row['motion']=='run' and row['frame']==15.25 for row in corrective['checks']),'Missing left-loop corrective regression')
        require(corrective['blend_sha256']==source_hash and corrective['glb_sha256']==deformation['glb_sha256'],'Stale corrective master/export')
        require(corrective['combined_error_bound_m']<corrective['threshold_m']<=.00003,'Corrective error remains')
        for path,sha in corrective['hashes'].items():require(digest(Path(path))==sha,'Stale corrective input: '+path)
    material=read(outfit/'material-export-report.json')
    require(material['status']=='passed' and material['sha256']==deformation['glb_sha256'],'Stale material proof')
    attachments=[]
    for relative in args.attachment:
        report=read(catalog/relative)
        require(report['status']=='passed' and report['blend_sha256']==source_hash,'Stale attachment: '+relative)
        require(len(report['checks'])==6,'Incomplete head gestures: '+relative)
        require(all(not any(c['obstacle_pairs'].values()) for c in report['checks']),'Head gesture contacts remain: '+relative)
        attachments.append({'path':relative,**report})
    browser=read(artifacts/'browser-report.json')
    require({r['label'] for r in browser['results']}=={'desktop-rest','desktop-walk','desktop-run','mobile-run'},'Missing browser cases')
    for entry in browser['manifest'].values():
        require(digest(Path(entry['path']))==entry['sha256'],'Stale browser asset: '+entry['path'])
    for case in browser['results']:
        require(not case['errors'],'Browser errors: '+case['label'])
        require(all(isinstance(f,dict) and f['method']=='HEAD' and f['reason']=='net::ERR_ABORTED' for f in case['failed']),'Failed asset requests: '+case['label'])
        require(min(case['canvas'].values())>0,'Empty canvas: '+case['label'])
        if case['label']!='desktop-rest':
            require(case['renderSha256']!=case['laterRenderSha256'],'No observed animation: '+case['label'])
    details=[]
    verified_sources={meta['blend'] for meta in motion.values()}
    for relative in args.detail:
        detail=read(catalog/relative)
        require(detail['blend'] in verified_sources,'Detail source is outside the outfit: '+relative)
        require(digest(Path(detail['blend']))==detail['blend_sha256'],'Stale stitched-detail source: '+relative)
        require(detail['status']=='passed' and detail['samples']==164,'Incomplete detail fit: '+relative)
        require(0<=detail['max_cloth_distance_m']<detail['threshold_m'],'Detail drift remains: '+relative)
        roles=detail.get('attachment_roles')
        if roles:
            require(roles['samples']==164 and all(counts['anchors']>0 and counts['free']>0 for counts in roles['counts'].values()),'Incomplete flexible attachment roles: '+relative)
            require(0<=roles['max_anchor_distance_m']<roles['anchor_threshold_m']<=.012,'Sewn attachment drift remains: '+relative)
            require(roles['max_free_extension_growth_m']<roles['free_extension_drift_m']<=.003,'Free detail extension drift remains: '+relative)
            require(detail['threshold_m']<=max(.012,max(roles['free_rest_extension_m'].values())+roles['free_extension_drift_m']),'Invalid free extension bound: '+relative)
        if detail.get('require_detail_clear'):
            require(detail['max_detail_shell_pairs']==0,'Detail intersects its shell: '+relative)
        details.append({'path':relative,**{k:v for k,v in detail.items() if k!='checks'}})
    report={
        'status':'fit and export candidate checks passed; final style/budget and actual runtime catalog registration pending',
        'outfit':args.outfit,'source_blend_sha256':source_hash,'motion':motion,
        'export_max_error_m':deformation['max_error_m'],'export_check_count':len(deformation['checks']),
        'export_glb_sha256':deformation['glb_sha256'],'validated_exports':validation,
        'materials_status':material['status'],'attachments':attachments,
        'stitched_details':details,
        'runtime_correctives':corrective,'corrective_sides':side_proof,
        'opening_coverage':[],
        'browser_cases':[c['label'] for c in browser['results']],'browser_manifest':browser['manifest'],
        'browser_profile':browser.get('verificationProfile'), 'browser_build_identity':browser.get('buildIdentity'),
        'known_browser_cleanup':'Expected availability HEAD aborts are retained; no failed GETs or page/console errors.',
        'runtime_limit':'Candidate GLB substitution through the existing top slot; actual bottom/shoes/accessory slot registration and switching remain pending. The current default preview camera can crop feet, especially on mobile; full-body framing remains integration work.',
        'scope_limit':'Quarter-frame samples of current walk/run on H01, plus the listed head gestures; other motion, head variants and final style are not proven.',
        'evidence_freshness':'All referenced source/GLB/material/attachment/browser hashes match current files when this summary is written.'
    }
    target=outfit/'verification-summary.json'
    for relative in args.coverage:
        coverage=read(catalog/relative)
        require(coverage['blend'] in verified_sources,'Coverage source outside outfit: '+relative)
        require(digest(Path(coverage['blend']))==coverage['blend_sha256'],'Stale coverage source: '+relative)
        require(coverage['status']=='passed' and coverage['removed_faces_above_boundary']==0,'Opening anatomy removed: '+relative)
        require(coverage['maximum_removed_face_z']<coverage['coverage_boundary_z']<=coverage['opening_z'],'Invalid coverage boundary: '+relative)
        require(coverage['margin_m']>=0 and coverage['coverage_group']=='covered_'+coverage['piece'],'Invalid coverage contract: '+relative)
        report['opening_coverage'].append({'path':relative,**coverage})
    target.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'outfit':args.outfit,'verified_sources':len(motion),'validated_glbs':len(validation),'export_max_error_m':deformation['max_error_m'],'head_gesture_reports':len(attachments),'browser_cases':report['browser_cases'],'summary':str(target)},indent=2))

if __name__=='__main__':
    main()
