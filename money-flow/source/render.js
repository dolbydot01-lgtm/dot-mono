const {chromium}=require('playwright');const {spawn}=require('child_process');
(async()=>{const FPS=30;const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
await p.goto('file://'+process.cwd()+'/out/index.html?capture');await p.waitForFunction(()=>window.TOTAL);await p.evaluate(()=>document.fonts.ready);
const total=await p.evaluate(()=>TOTAL);const N=Math.ceil(total*FPS);
const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-i','soundtrack.mp3',
 '-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-shortest','-movflags','+faststart','out/money-flow-7min.mp4'],{stdio:['pipe','inherit','inherit']});
for(let i=0;i<N;i+=30){const arr=await p.evaluate(([t0,n,f])=>grab(t0,n,f,.92),[i/FPS,Math.min(30,N-i),FPS]);
 for(const d of arr){const buf=Buffer.from(d.split(',')[1],'base64');if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));}
 if(i%900===0)console.log(i,'/',N);}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('done');})();
