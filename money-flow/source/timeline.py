import json, subprocess
script=json.load(open("script.json"))
def dur(f): return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f]))
t=1.6; i=0; scenes=[]; parts=[]
for sc in script:
    s={"id":sc["scene"],"title":sc["title"],"start":t,"lines":[]}
    for l in sc["lines"]:
        d=dur(f"audio/{i:02d}.mp3")
        s["lines"].append({"text":l,"start":round(t,3),"end":round(t+d,3)})
        parts.append((t,f"audio/{i:02d}.mp3"))
        t+=d+0.55; i+=1
    t+=1.1; s["end"]=round(t,3); scenes.append(s)
total=round(t+3.0,2)
json.dump({"total":total,"scenes":scenes},open("timeline.json","w"),ensure_ascii=False,indent=1)
# build narration track
inputs=[];flt=[]
for k,(st,f) in enumerate(parts):
    inputs+=["-i",f]; ms=int(st*1000); flt.append(f"[{k}]adelay={ms}|{ms}[a{k}]")
mix="".join(f"[a{k}]" for k in range(len(parts)))+f"amix=inputs={len(parts)}:normalize=0,apad=whole_dur={total}[out]"
subprocess.run(["ffmpeg","-y","-v","error",*inputs,"-filter_complex",";".join(flt)+";"+mix,"-map","[out]","-ac","2","-ar","44100","-b:a","160k","narration.mp3"],check=True)
print(total)
