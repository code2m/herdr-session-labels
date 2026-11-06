"""Emit controlled terminal title/status events; no model or network calls."""
import base64
import sys

def emit(app, title, state):
    encoded = base64.b64encode(title.encode()).decode()
    print(f'\033]2;{title}\033\\\033]7501;state={state}:app={app}:title={encoded}\033\\', end='', flush=True)
    print('\033[2J\033[HSESSION LABELS DEMO\n', end='')
    print('Session: '+title.replace('OpenClaw | ','').replace(' | demo',''))
    print('State: '+state+'\n\nControlled terminal title reports.\nNo model conversation is running.', flush=True)

emit(*sys.argv[1:4])
for line in sys.stdin:
    fields = line.rstrip('\r\n').split('\t')
    if len(fields) == 3:
        emit(*fields)
