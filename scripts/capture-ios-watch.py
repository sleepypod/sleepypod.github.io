#!/usr/bin/env python3
"""Use the pinned iOS capture pipeline with an explicitly selected disposable simulator.
IOS_SOURCE_ROOT points to iOS ce1d455; IOS_CAPTURE_UDID must be a dedicated test device.
Build once with the upstream script before using --skip-build here.
"""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

root = Path(os.environ['IOS_SOURCE_ROOT']).resolve()
revision = subprocess.check_output(['git', '-C', str(root), 'rev-parse', 'HEAD'], text=True).strip()
if revision != 'ce1d455cb69b00413f8d84630052c1878d9a5f5b':
    raise RuntimeError('Use the pinned iOS revision')
udid = os.environ['IOS_CAPTURE_UDID']
listing = json.loads(subprocess.check_output(['xcrun', 'simctl', 'list', 'devices', '-j']))
device = next(d for group in listing['devices'].values() for d in group if d['udid'] == udid)
if device['name'] != 'sleepypod Docs Watch':
    raise RuntimeError('Only the dedicated sleepypod Docs Watch simulator may be reset')
spec = importlib.util.spec_from_file_location('ios_capture', root / 'Marketing/AppStore/capture.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.device = lambda name: device
sys.argv = [str(module.__file__), '--skip-build', '--video', '--only', 'clip-sleep-watch',
            '--only', '07-apple-watch', '--appearance', 'dark']
module.main()
