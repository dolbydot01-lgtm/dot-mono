import json, os, shutil
os.makedirs('out', exist_ok=True)
s = open('part_head.html').read() + open('scenes.js').read() + open('part_tail.html').read()
s = s.replace("A(a,()=>{pill(S.title,30+ctx.measureText(S.title).width/2,40,",
              "A(a,()=>{ctx.font=`600 17px ${FONT}`;pill(S.title,44+ctx.measureText(S.title).width/2,40,")
s = s.replace('src="narration.mp3"', 'src="soundtrack.mp3"')
d = json.load(open('timeline.json')); d['scenes'][0]['start'] = 0
s = s.replace('/*TIMELINE*/null', json.dumps(d, ensure_ascii=False))
open('out/index.html', 'w').write(s)
shutil.copy('soundtrack.mp3', 'out/soundtrack.mp3')
