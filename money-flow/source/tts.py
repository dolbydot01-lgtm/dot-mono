import certifi, os, json, asyncio, subprocess
certifi.where = lambda: "/root/.ccr/ca-bundle.crt"
import edge_tts
VOICE="zh-CN-YunyangNeural"
script=json.load(open("script.json"))
spoken = lambda s: s.replace("401k","四零一K").replace("GDP","G D P")
async def gen(i,text):
    out=f"audio/{i:02d}.mp3"
    for attempt in range(4):
        try:
            c=edge_tts.Communicate(spoken(text),VOICE,rate="+5%",proxy=os.environ["HTTPS_PROXY"])
            await c.save(out); return out
        except Exception as e:
            print("retry",i,e); await asyncio.sleep(2)
async def main():
    i=0; jobs=[]
    for sc in script:
        for l in sc["lines"]:
            jobs.append(gen(i,l)); i+=1
    for j in jobs: await j
asyncio.run(main())
