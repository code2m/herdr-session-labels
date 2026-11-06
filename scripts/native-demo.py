"""Exercise only a scratch Herdr app home and scratch core; never the user's core."""
import json, os, pathlib, shutil, subprocess, sys, tempfile, time

package = pathlib.Path(__file__).resolve().parents[1]
root = pathlib.Path(tempfile.mkdtemp(prefix='hnq-', dir='/private/tmp'))
appbin = shutil.which('herdr-app') or str(pathlib.Path.home()/'.local/bin/herdr-app')
corebin = shutil.which('herdr-core') or str(pathlib.Path.home()/'.local/bin/herdr-core')
env = dict(os.environ)
for key in ('HC_SOCKET', 'HC_TERMINAL_ID', 'HC_TERMINAL_SOCKET', 'HC_SCOPE'):
    env.pop(key, None)
env.update(HERDR_APP_HOME=str(root/'home'), HC_SESSION='hnq'+root.name[-5:],
           XDG_STATE_HOME=str(root/'state'), XDG_CONFIG_HOME=str(root/'config'),
           HERDR_APP_NO_SOUND='1', HERDR_TELEMETRY='0')
home=root/'home';home.mkdir()
for name in ('layouts','mods'):shutil.copytree(package/name,home/name)
baseline=home/'mods/baseline-agents';baseline.mkdir()
shutil.copy2(package/'tests/baseline/agents.js',baseline/'main.js')
(baseline/'mod.json').write_text('{"place":"none"}')
base=json.loads((home/'layouts/session-labels.json').read_text())
text=json.dumps(base).replace('session-labels-agents','baseline-agents').replace('session-labels-pane','pane')
(home/'layouts/baseline-demo.json').write_text(text)
(home/'shared.json').write_text(json.dumps({'frame.welcomed':True,'layout':'session-labels'}))
(home/'settings.json').write_text(json.dumps({'zoom':1,'telemetry':False,'sounds':{'enabled':False}}))
(home/'update-notes.json').write_text(json.dumps({'last_run':'0.1.13','presented':['0.1.13']}))
(root/'environment.json').write_text(json.dumps({k:env[k] for k in ('HERDR_APP_HOME','HC_SESSION','XDG_STATE_HOME','XDG_CONFIG_HOME')}))
print('Scratch environment:',root,flush=True)

def call(binary,*args):
    result=subprocess.run([binary,*args],env=env,capture_output=True,text=True,timeout=20)
    if result.returncode:raise RuntimeError(result.stdout+result.stderr)
    return result.stdout
def do(command,**args):return json.loads(call(appbin,'do',command,json.dumps(args)) or '{}')
def shot(name):
    time.sleep(.6)
    print(call(appbin,'shot',str(package/name)),flush=True)
fixture=[sys.executable,str(package/'scripts/demo-terminal.py')]
demo=pathlib.Path('/private/tmp/herdr-session-labels-demo')
demo.mkdir(exist_ok=True)
terminals=[];app=None
try:
    call(corebin,'server','start')
    log=open(root/'app.log','w')
    app=subprocess.Popen([appbin],env=env,stdin=subprocess.DEVNULL,stdout=log,stderr=log)
    for _ in range(50):
        try:
            state=json.loads(call(appbin,'status'))
            if state.get('layout'):break
        except RuntimeError:pass
        time.sleep(.2)
    time.sleep(1)
    for _ in range(5):
        state=json.loads(call(appbin,'status'))
        if not state.get('overlays'):break
        do('overlay.close')
    for mod in ('session-labels-agents','session-labels-pane'):
        output=call(appbin,'check',str(package/'mods'/mod))
        (package/'tests'/(mod+'-check.txt')).write_text(('Command: herdr-app check <package>/mods/'+mod+'\n'+output.replace(str(package),'<package>')+'Exit code: 0\n'))
    created=do('space.new',name='Demo',folder=str(demo),tab='Frontend',argv=fixture+['codex','Review | demo','idle'])
    terminals.append(created['terminal'])
    second=do('pane.split',direction='right',argv=fixture+['claude-code','Review','idle'])
    terminals.append(second['terminal'])
    time.sleep(2)
    do('layout.resize',id='sidebar',px=360)
    shot('preview.png')
    shot('docs/after.png')
    do('layout.switch',name='baseline-demo')
    shot('docs/before.png')
    do('layout.switch',name='session-labels')
    do('layout.resize',id='sidebar',px=180)
    shot('docs/narrow.png')
    do('layout.resize',id='sidebar',px=360)
    do('tab.rename',name='Renamed')
    call(corebin,'send',second['terminal'],'openclaw\tOpenClaw | Δοκιμή 🤖\tworking')
    shot('docs/renamed.png')
    do('layout.resize',id='sidebar',px=180)
    shot('docs/narrow-renamed.png')
    result=json.loads(call(appbin,'status'))
    assert not result.get('errors'),result
    (package/'tests/native-status.json').write_text(json.dumps({'command':'herdr-app status','stdout':result,'app_version':call(appbin,'--version').strip(),'note':'Isolated home/core; protocol fixtures, no model calls.'},indent=2)+'\n')
finally:
    if app and app.poll() is None:
        app.terminate()
        try:app.wait(timeout=10)
        except subprocess.TimeoutExpired:app.kill();app.wait()
    for terminal in terminals:
        try:call(corebin,'kill',terminal)
        except RuntimeError:pass
    try:call(corebin,'server','stop')
    except RuntimeError:pass
    print('Stopped scratch app and scratch core only.',flush=True)
