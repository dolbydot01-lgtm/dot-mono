/* ---------- chart helpers ---------- */
function panel(x,y,w,h,a,title,sub,fn){A(a,()=>{rr(x,y,w,h,14);ctx.fillStyle='rgba(20,28,49,.95)';ctx.fill();ctx.strokeStyle=C.line;ctx.lineWidth=1.2;ctx.stroke();
  if(title)txt(title,x+24,y+30,{size:19,weight:800,align:'left'});if(sub)txt(sub,x+w-24,y+30,{size:13,color:C.muted,align:'right'});fn&&fn();});}
function caseTag(x,y,s){pill(s,x,y,{size:14,bg:C.gold,color:'#2a1d00',padX:12});}
/* o: x,y,w,h,data[[label,v,sub?]],max,color,at,stagger,hi[],hiColor,fmt */
function barChart(t,o){const{x,y,w,h,data,max,color=C.gold,at,stagger=.18,hi=null,hiColor=C.cn,fmt=v=>v.toFixed(1),dimOthers=false}=o;
  const n=data.length,slot=w/n,bw=Math.min(78,slot*.58);
  ctx.fillStyle=C.line;ctx.fillRect(x,y+h,w,1.5);
  data.forEach(([lb,v,sub],i)=>{const a=clamp((t-at-i*stagger)/.8);if(a<=0)return;const f=easeOut(a),bh=h*v/max*f,bx=x+i*slot+(slot-bw)/2;
    const isHi=hi&&hi.includes(i);A(dimOthers&&hi&&!isHi?.45:1,()=>{rr(bx,y+h-bh,bw,Math.max(1,bh),5);ctx.fillStyle=isHi?hiColor:color;ctx.fill();
      A(clamp(a*2-1),()=>txt(fmt(v),bx+bw/2,y+h-bh-13,{size:15,weight:800,color:isHi?hiColor:C.text}));
      txt(lb,bx+bw/2,y+h+18,{size:14,color:C.muted});if(sub)txt(sub,bx+bw/2,y+h+37,{size:12,color:C.muted});});});
  return i=>({x:x+i*slot+slot/2,top:v=>y+h-h*v/max});}
/* o: x,y,w,h,data[[label,v]],min,max,color,at,dur,fmt,showAll */
function lineChart(t,o){const{x,y,w,h,data,min=0,max,color=C.gold,at,dur=2.5,fmt=v=>String(v)}=o;
  const n=data.length,P=data.map(([l,v],i)=>[x+i*(w/(n-1)),y+h-(v-min)/(max-min)*h]);
  ctx.fillStyle=C.line;ctx.fillRect(x,y+h,w,1.5);for(let k=1;k<=3;k++){ctx.fillStyle='rgba(255,255,255,.04)';ctx.fillRect(x,y+h-h*k/4,w,1);}
  const p=easeOut(clamp((t-at)/dur))*(n-1),k=Math.floor(p),fr=p-k;
  const pts=P.slice(0,k+1);if(k<n-1)pts.push([lerp(P[k][0],P[k+1][0],fr),lerp(P[k][1],P[k+1][1],fr)]);
  if(pts.length>1){const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,color+'55');g.addColorStop(1,color+'00');
    ctx.beginPath();ctx.moveTo(pts[0][0],y+h);pts.forEach(q=>ctx.lineTo(q[0],q[1]));ctx.lineTo(pts[pts.length-1][0],y+h);ctx.closePath();ctx.fillStyle=g;ctx.fill();
    ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.strokeStyle=color;ctx.lineWidth=3.5;ctx.lineJoin='round';ctx.stroke();}
  data.forEach(([l,v],i)=>{txt(l,P[i][0],y+h+18,{size:14,color:C.muted});if(i<=p+.001){ctx.beginPath();ctx.arc(P[i][0],P[i][1],5.5,0,7);ctx.fillStyle=color;ctx.fill();
    txt(fmt(v),P[i][0],P[i][1]-17,{size:15,weight:800});}});
  return P;}
function dimLayer(a,fn){A(a,fn);}

/* ---------- scenes ---------- */
function sIntro(t,S){const L=S.L;
  const lift=ease(clamp((t-L[1])/1.4)),bx=640,by=lerp(345,320,lift)+Math.sin(t*1.3)*5,sc=lerp(1,.6,lift);
  const a0=ap(t,.2,.9);
  for(let k=0;k<12;k++){const an=t*.55+k*Math.PI/6,rx=lerp(250,300,lift),ry=lerp(110,80,lift);
    A(a0*.9,()=>coin(bx+Math.cos(an)*rx,by+Math.sin(an)*ry,8+3*Math.sin(an)));}
  A(a0,()=>banknote(bx,by,sc,C.cn));
  A(win(t,L[0]+.4,L[1]+.3),()=>{txt('从哪里来？',230,345,{size:32,weight:800,color:C.gold});txt('流向哪里？',1050,345,{size:32,weight:800,color:C.gold});
    arrow(330,345,410,345,C.gold);arrow(870,345,950,345,C.gold);});
  A(ap(t,L[1]-.2,.9),()=>{txt('钱，是怎么流动的？',640,130,{size:58,weight:800});txt('7 分钟看懂社会里的“资金管道”　｜　附真实案例与数据',640,190,{size:20,color:C.muted});});
  const P=[['家庭',C.gold],['企业',C.teal],['银行',C.cn],['政府','#7d88a3']],xs=[340,540,740,940],y=505;
  const at=i=>L[1]+2.8+i*.55;
  for(let i=0;i<3;i++)pipe(t,{x:xs[i],y,r:34},{x:xs[i+1],y,r:34},{w:4,show:ap(t,at(i+1),.8)});
  pipe(t,{x:xs[3],y,r:30},{x:xs[0],y,r:30},{bend:-95,w:4,show:ap(t,at(3)+.6,1.2)});
  P.forEach(([s,c],i)=>A(ap(t,at(i)),()=>pill(s,xs[i],y,{size:21,bg:c,color:i===3?'#fff':'#141018',padX:18})));
}
function sCreate(t,S){const L=S.L;
  A(win(t,S.start,L[1]+.2),()=>{
    node({x:360,y:250,r:56},{a:ap(t,L[0]),color:C.muted,icon:'press',label:'印出来的现金'});
    node({x:920,y:250,r:56},{a:ap(t,L[0]+.6),color:C.gold,icon:'bank',label:'银行账户里的存款',glow:1});
    A(ap(t,L[0]+1.4),()=>{const x=240,w=800,y=430,h=34,f=easeOut(clamp((t-L[0]-1.4)/1.6));
      txt('以广义货币 M2（约 360 万亿元）为例',640,392,{size:16,color:C.muted});
      rr(x,y,w,h,8);ctx.fillStyle='rgba(255,255,255,.06)';ctx.fill();
      rr(x,y,w*f,h,8);ctx.fillStyle=C.gold;ctx.fill();rr(x,y,w*.04,h,8);ctx.fillStyle='#8a93a8';ctx.fill();
      txt('现金 <5%',x,y+h+20,{size:15,color:C.muted,align:'left'});txt('其余都是“存款”——账户里的数字',x+w,y+h+20,{size:15,color:C.gold,align:'right',weight:700});});
  });
  A(win(t,L[1],L[2]+.3),()=>{const bk={x:360,y:250,r:56},fi={x:920,y:250,r:56};
    node(bk,{a:ap(t,L[1]),color:C.gold,icon:'bank',label:'银行'});
    node(fi,{a:ap(t,L[1]+.3),color:C.teal,icon:'factory',label:'企业'});
    pipe(t,bk,fi,{w:10,show:ap(t,L[1]+.8,1.2),label:'贷款 100 万'});
    card(380,370,520,150,ap(t,L[1]+1.6),()=>{txt('银行的账本',640,395,{size:16,color:C.muted,weight:700});
      ctx.fillStyle=C.line;ctx.fillRect(640,415,1.5,90);ctx.fillRect(400,415,480,1.5);
      txt('资产',510,436,{size:15,color:C.muted});txt('负债',770,436,{size:15,color:C.muted});
      A(ap(t,L[1]+2.4),()=>txt('贷款  +100 万',510,476,{size:24,weight:800,color:C.gold}));
      A(ap(t,L[1]+3.6),()=>txt('企业存款  +100 万',770,476,{size:24,weight:800,color:C.teal}));});
    A(ap(t,L[1]+5),()=>{const p=.5+.5*Math.sin(t*4);txt('贷款，创造了存款',640,118,{size:32,weight:800,color:C.gold});
      txt('信用创造货币',640,160,{size:18,color:C.muted});ctx.strokeStyle=C.gold;ctx.globalAlpha*=.3+.4*p;ctx.lineWidth=2;rr(376,366,528,158,14);ctx.stroke();});
  });
  panel(140,76,1000,470,win(t,L[2],L[3]+.3),'广义货币 M2 余额','单位：万亿元（年末；2026 为 9 月末）',()=>{
    lineChart(t,{x:200,y:150,w:880,h:320,data:[['2000',13.5],['2005',29.9],['2010',72.6],['2015',139.2],['2020',218.7],['2024',313.5],['2026',359.6]],max:400,at:L[2]+.6,dur:5,fmt:v=>v>=100?Math.round(v):v.toFixed(1)});
    A(ap(t,L[2]+6.5),()=>pill('二十多年 × 26',330,200,{size:18,bg:C.gold,color:'#2a1d00',padX:16}));});
  A(win(t,L[3],L[4]+.3),()=>{const cb={x:640,y:160,r:58},bks=[{x:380,y:420,r:40},{x:640,y:420,r:40},{x:900,y:420,r:40}];
    const vs=ap(t,L[3]+2.5),om=1.6,dt=Math.max(0,t-L[3]-2.5),sp=1+vs*.85*Math.sin(dt*om),ph=t+vs*.85*(1-Math.cos(dt*om))/om;
    bks.forEach((b,i)=>{pipe(t,cb,b,{w:7,show:ap(t,L[3]+.8+i*.2,1),phase:ph});node(b,{a:ap(t,L[3]+.4+i*.15),color:C.gold,icon:'bank',label:'商业银行'});});
    node(cb,{a:ap(t,L[3]),color:C.cn,icon:'bank',label:'人民银行',glow:1});
    A(vs,()=>{const x=1110,y=320;ctx.beginPath();ctx.arc(x,y,48,Math.PI,0);ctx.strokeStyle=C.line;ctx.lineWidth=10;ctx.stroke();
      const g=ctx.createLinearGradient(x-48,0,x+48,0);g.addColorStop(0,C.teal);g.addColorStop(1,C.cn);ctx.strokeStyle=g;ctx.lineWidth=6;ctx.beginPath();ctx.arc(x,y,48,Math.PI,0);ctx.stroke();
      const an=Math.PI+Math.PI*clamp((sp-0.15)/1.7);ctx.strokeStyle=C.text;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(an)*40,y+Math.sin(an)*40);ctx.stroke();
      txt('放贷快慢',x,y+24,{size:15,weight:700});pill('利率',x-44,y+60,{size:14,border:C.gold});pill('存款准备金',x+40,y+96,{size:14,border:C.gold});});
  });
  // case: 2024-09
  panel(120,76,1040,470,ap(t,L[4]),'2024 年 9 月 · 降准 + 降息',null,()=>{caseTag(1080,106,'真实案例');
    // left: reserve vault
    const r=ease(clamp((t-L[4]-2)/2)),vx=200,vy=170,vw=180,vh=260;
    rr(vx,vy,vw,vh,10);ctx.strokeStyle=C.muted;ctx.lineWidth=2;ctx.stroke();
    const lvl=lerp(.72,.66,r);rr(vx+4,vy+vh-vh*lvl,vw-8,vh*lvl-4,8);ctx.fillStyle='rgba(56,194,176,.35)';ctx.fill();
    txt('准备金（锁在央行）',vx+vw/2,vy-16,{size:14,color:C.muted});
    txt(r>.5?'约 6.6%':'约 7.1%',vx+vw/2,vy+vh-vh*lvl+28,{size:22,weight:800,color:C.teal});
    A(r,()=>{txt('-0.5 个百分点',vx+vw/2,vy+vh+22,{size:15,weight:700,color:C.cn});});
    pipe(t,{x:vx+vw,y:vy+90,r:6},{x:560,y:vy+90,r:6},{w:14,show:ap(t,L[4]+2.6,1),label:'释放',lp:.5});
    A(ap(t,L[4]+3.2),()=>{txt('≈ 1 万亿元',650,vy+80,{size:36,weight:800,color:C.gold});txt('长期资金，可用于放贷',650,vy+118,{size:15,color:C.muted});});
    // right: policy rate step chart
    A(ap(t,L[4]+7),()=>{const x0=820,y0=200,w=280,h=180,u=ease(clamp((t-L[4]-7.5)/1.5));
      txt('7 天逆回购利率（政策利率）',x0+w/2,y0-22,{size:14,color:C.muted});
      ctx.fillStyle=C.line;ctx.fillRect(x0,y0+h,w,1.5);
      const yA=y0+h-(1.7-1.2)/(.6)*h,yB=y0+h-(1.5-1.2)/(.6)*h;
      ctx.strokeStyle=C.cn;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x0,yA);ctx.lineTo(x0+w*.5,yA);if(u>0){ctx.lineTo(x0+w*.5,lerp(yA,yB,u));ctx.lineTo(x0+w*.5+w*.5*u,lerp(yA,yB,u));}ctx.stroke();
      txt('1.7%',x0+w*.22,yA-16,{size:18,weight:800});A(u,()=>txt('1.5%',x0+w*.8,yB-16,{size:18,weight:800,color:C.cn}));
      txt('调整前',x0+w*.22,y0+h+18,{size:13,color:C.muted});txt('调整后',x0+w*.8,y0+h+18,{size:13,color:C.muted});});
    A(ap(t,L[4]+10),()=>txt('钱更多、更便宜 → 鼓励企业和家庭借钱、投资和消费',640,500,{size:17,weight:700,color:C.gold}));
  });
}
function sLoop(t,S){const L=S.L,HH={x:240,y:330,r:52},FI={x:1040,y:330,r:52},BK={x:640,y:330,r:50},GV={x:640,y:135,r:46};
  const dim=1-.9*win(t,L[1]-.2,L[2]+.3,.6);
  A(dim,()=>{
    pipe(t,FI,HH,{bend:-160,w:9,show:ap(t,L[0]+1.6,1),label:'工资',lp:.25});
    pipe(t,HH,FI,{bend:-160,w:9,show:ap(t,L[0]+3.8,1),label:'消费'});
    pipe(t,HH,BK,{w:lerp(6,18,ap(t,L[2]+1,1.4)),show:ap(t,L[2]+.4,1),label:'存款',lp:.45});
    pipe(t,BK,FI,{w:lerp(6,20,ap(t,L[2]+2.5,1.4)),show:ap(t,L[2]+2,1),label:'贷款',lp:.55});
    pipe(t,HH,GV,{bend:35,w:5,dash:[7,9],show:ap(t,L[3]+3,1),label:'税',lp:.45});
    pipe(t,FI,GV,{bend:-35,w:5,dash:[7,9],show:ap(t,L[3]+3.3,1),label:'税',lp:.45});
    node(HH,{a:ap(t,S.start+.2),color:C.gold,icon:'house',label:'家庭'});
    node(FI,{a:ap(t,S.start+.5),color:C.teal,icon:'factory',label:'企业'});
    node(BK,{a:ap(t,L[2]),color:C.cn,icon:'bank',label:'银行',glow:ap(t,L[2])});
    node(GV,{a:ap(t,L[3]+1.2),color:C.gold,icon:'gov',label:'政府',glow:(.6+.4*Math.sin(t*3))*ap(t,L[3]+1.2)});
    card(950,72,240,96,ap(t,L[2]+5.5),()=>{txt('人民币贷款余额',1070,98,{size:14,color:C.muted});
      txt(Math.round(countUp(t,L[2]+5.8,2.2,283))+' 万亿元',1070,136,{size:30,weight:800,color:C.cn});});
  });
  panel(200,76,880,460,win(t,L[1],L[2]+.3),'住户存款：每年新增多少','单位：万亿元',()=>{
    barChart(t,{x:250,y:150,w:780,h:300,data:[['2019',9.7],['2020',11.3],['2021',9.9],['2022',17.8],['2023',16.7],['2024',14.3]],max:20,at:L[1]+.6,stagger:.35,hi:[3],hiColor:C.gold,color:'#5b6684'});
    A(ap(t,L[1]+3.5),()=>pill('历史纪录',250+780/6*3.5,138,{size:14,bg:C.gold,color:'#2a1d00'}));});
}
function sTax(t,S){const L=S.L;
  const segs=[['增值税',6.89,C.gold],['企业所得税',4.13,C.teal],['消费税',1.69,C.cn],['个人所得税',1.62,C.violet],['其他',3.31,'#5b6684']];
  A(win(t,S.start,L[3]+.3),()=>{
    txt('2025 年全国税收收入',640,92,{size:18,color:C.muted});
    txt('约 '+countUp(t,L[0]+.3,2,17.6).toFixed(1)+' 万亿元',640,134,{size:40,weight:800,color:C.gold});
    const x0=120,Wd=1040,y=182,h=48,f=ease(clamp((t-L[0]-1.2)/1.6));
    const hi=t>=L[2]?[1,2,3]:t>=L[1]?[0]:null;let x=x0;
    segs.forEach(([n,v,c],i)=>{const w=Wd*v/17.64,vis=clamp((f*Wd-(x-x0))/w);
      if(vis>0)A((hi&&!hi.includes(i))?.3:1,()=>{rr(x,y,Math.max(2,(w-4)*vis),h,8);ctx.fillStyle=c;ctx.fill();
        if(vis>.9){const dark=i===0;txt(n,x+w/2-2,y+17,{size:w>110?16:13,weight:700,color:dark?'#2a1d00':'#fff'});
          txt(v.toFixed(1)+' 万亿',x+w/2-2,y+36,{size:13,color:dark?'#4a3500':'rgba(255,255,255,.85)'});}});
      x+=w;});
    A(ap(t,L[0]+5),()=>pill('近四成',x0+Wd*6.89/17.64/2,y-16,{size:14,bg:C.gold,color:'#2a1d00'}));
  });
  // VAT example: air conditioner
  A(win(t,L[1]+.8,L[2]+.3),()=>{const st=[['零件厂','卖出 1500',1500],['整机厂','卖出 2500',1000],['家电卖场','卖出 3000',500]],xs=[230,520,810],y=330;
    caseTag(1080,268,'举例：一台空调');
    st.forEach(([n,s,add],i)=>{const a=ap(t,L[1]+3+i*1.4);if(a<=0)return;
      A(a,()=>{rr(xs[i]-95,y-42,190,84,12);ctx.fillStyle=C.panel;ctx.fill();ctx.strokeStyle=C.gold;ctx.lineWidth=1.6;ctx.stroke();
        txt(n,xs[i],y-16,{size:18,weight:700});txt(s+' 元',xs[i],y+14,{size:15,color:C.muted});
        if(i)arrow(xs[i-1]+101,y,xs[i]-103,y,C.muted,2);
        pill('新增 '+add+' → 税 '+Math.round(add*.13),xs[i],y+70,{size:14,border:C.gold,color:C.gold});});});
    A(ap(t,L[1]+7.2),()=>{node({x:1080,y:330,r:42},{color:C.teal,icon:'house',label:'消费者'});arrow(912,330,1030,330,C.muted,2);});
    A(ap(t,L[1]+9),()=>{ctx.fillStyle='rgba(243,193,75,.16)';rr(150,452,980,34,17);ctx.fill();
      txt('三环合计交税 195 + 130 + 65 = 390 元，正好是终端售价 3000 元的 13%',640,469,{size:16,weight:700,color:C.gold});});
  });
  A(win(t,L[2]+.4,L[3]+.3),()=>{[['企业所得税','对企业利润征收，约 4.1 万亿',C.teal],['消费税','烟、酒、成品油等，约 1.7 万亿',C.cn],['个人所得税','工资薪金、劳务等，约 1.6 万亿',C.violet]].forEach(([n,d,c],i)=>
    A(ap(t,L[2]+.4+i*1.6),()=>{const x=260+i*380;rr(x-170,300,340,100,12);ctx.fillStyle=C.panel;ctx.fill();ctx.strokeStyle=c;ctx.lineWidth=1.6;ctx.stroke();
      txt(n,x,333,{size:21,weight:800,color:c});txt(d,x,368,{size:15,color:C.muted});}));});
  // PIT case chart
  panel(140,76,1000,470,win(t,L[3],L[4]+.3),'个人所得税收入','单位：万亿元',()=>{caseTag(960,106,'真实案例');
    const D=[['2017',1.20],['2018',1.39],['2019',1.04],['2020',1.16],['2021',1.40],['2022',1.49],['2023',1.48],['2024',1.46],['2025',1.62]];
    barChart(t,{x:190,y:160,w:900,h:290,data:D,max:1.9,at:L[3]+.5,stagger:.22,hi:[2],hiColor:C.cn,color:C.violet,fmt:v=>v.toFixed(2)});
    A(ap(t,L[3]+5.5),()=>{pill('2018.10 起征点 3500 → 5000',190+900/9*1.5,150,{size:14,border:C.gold,color:C.gold});});
    A(ap(t,L[3]+8),()=>{pill('+ 专项附加扣除',190+900/9*1.5,182,{size:14,border:C.gold,color:C.gold});});
    A(ap(t,L[3]+11),()=>{pill('次年约 -25%',190+900/9*2.5,238,{size:15,bg:C.cn,color:'#fff'});});});
  // collection & split
  A(ap(t,L[4]),()=>{const P={x:190,y:420,r:44},TB={x:440,y:420,r:46},GK={x:700,y:420,r:50},CE={x:1060,y:335,r:46},LO={x:1060,y:505,r:46};
    pipe(t,P,TB,{w:9,show:ap(t,L[4]+.6,1),label:'申报纳税'});
    pipe(t,TB,GK,{w:9,show:ap(t,L[4]+1.6,1),label:'缴入国库'});
    pipe(t,GK,CE,{w:9,bend:-20,show:ap(t,L[4]+4,1)});pipe(t,GK,LO,{w:9,bend:20,show:ap(t,L[4]+4.3,1)});
    node(P,{a:ap(t,L[4]+.1),color:C.teal,icon:'factory',label:'企业 · 个人'});
    node(TB,{a:ap(t,L[4]+.9),color:C.muted,icon:'gov',label:'税务局'});
    node(GK,{a:ap(t,L[4]+1.9),color:C.cn,icon:'bank',label:'国库',sub:'由人民银行经理'});
    node(CE,{a:ap(t,L[4]+4),color:C.gold,icon:'gov',label:'中央'});
    node(LO,{a:ap(t,L[4]+4.3),color:C.teal,icon:'gov',label:'地方'});
    A(ap(t,L[4]+4.8),()=>pill('按规则自动分成',880,420,{size:14,bg:C.gold,color:'#2a1d00'}));
  });
  card(170,70,940,190,ap(t,L[5]),()=>{txt('主要税种怎么分',190,94,{size:16,weight:700,color:C.muted,align:'left'});
    txt('中央',640,94,{size:14,color:C.gold,align:'left'});txt('地方',1080,94,{size:14,color:C.teal,align:'right'});
    const rows=[['增值税（2016 全面营改增后）',.5,L[5]+3.5],['企业所得税 · 个人所得税',.6,L[5]+6.5],['消费税 · 关税 · 进口环节税',1,L[6]+.4],['契税 · 房产税 · 土地增值税',0,L[6]+3.6]];
    rows.forEach(([n,c,at],i)=>{const a=ap(t,at);if(a<=0)return;A(a,()=>{const y=128+i*36,x=600,w=480,f=easeOut(clamp((t-at)/1));
      txt(n,190,y,{size:17,weight:700,align:'left'});
      rr(x,y-11,w,22,11);ctx.fillStyle='rgba(255,255,255,.06)';ctx.fill();
      if(c>0){rr(x,y-11,w*c*f,22,11);ctx.fillStyle=C.gold;ctx.fill();}
      if(c<1){rr(x+w*c+(1-f)*w*(1-c),y-11,w*(1-c)*f,22,11);ctx.fillStyle=C.teal;ctx.fill();}
      A(clamp((t-at-.6)*2),()=>{if(c===1)txt('全部归中央',x+w/2,y+1,{size:13,weight:700,color:'#2a1d00'});
        else if(c===0)txt('全部归地方',x+w/2,y+1,{size:13,weight:700,color:'#04201c'});
        else{txt(Math.round(c*100)+'%',x+w*c/2,y+1,{size:13,weight:700,color:'#2a1d00'});txt(Math.round((1-c)*100)+'%',x+w*c+w*(1-c)/2,y+1,{size:13,weight:700,color:'#04201c'});}});});});});
}
function sTransfer(t,S){const L=S.L;
  panel(140,76,1000,470,win(t,S.start,L[1]+.3),'中央收入占全国财政收入的比重','单位：%',()=>{
    lineChart(t,{x:200,y:150,w:880,h:300,data:[['1990',33.8],['1993',22.0],['1994',55.7],['2000',52.2],['2005',52.3],['2025',43.5]],max:70,at:L[0]+.6,dur:5,color:C.gold,fmt:v=>v.toFixed(1)});
    A(ap(t,L[0]+5.5),()=>{pill('1994 分税制改革',200+880/5*2,128,{size:15,bg:C.gold,color:'#2a1d00'});});});
  A(win(t,L[1]-.4,L[3]+.2),()=>{const base=505,k=12.2,G=[{x:250,n:'中央',inc:9.4,exp:4.3},{x:540,n:'地方',inc:12.2,exp:24.4}];
    ctx.fillStyle=C.line;ctx.fillRect(130,base,560,2);
    rr(150,96,12,12,3);ctx.fillStyle=C.gold;ctx.fill();txt('收入',168,102,{size:14,color:C.muted,align:'left'});
    rr(220,96,12,12,3);ctx.fillStyle=C.cn;ctx.fill();txt('支出',238,102,{size:14,color:C.muted,align:'left'});
    txt('2025 年（万亿元）',300,102,{size:13,color:C.muted,align:'left'});
    const times=[[L[1]+1.5,L[1]+4.2],[L[1]+5.2,L[1]+7]];
    G.forEach((g,i)=>{txt(g.n,g.x,base+22,{size:18,weight:700});
      [[g.inc,C.gold,-42,times[i][0]],[g.exp,C.cn,42,times[i][1]]].forEach(([v,c,dx,at])=>{const f=easeOut(clamp((t-at)/1.2));if(f<=0)return;
        const h=v*k*f;rr(g.x+dx-32,base-h,64,h,6);ctx.fillStyle=c;ctx.fill();A(clamp((t-at-.8)*2),()=>txt(v.toFixed(1),g.x+dx,base-h-14,{size:17,weight:800,color:c}));});});
    A(ap(t,L[1]+9.5),()=>pill('约占全国 85%',582,base-24.4*k-44,{size:14,bg:C.cn,color:'#fff'}));
    A(ap(t,L[2]+.4),()=>{const x=600,y1=base-12.2*k,y2=base-24.4*k;ctx.setLineDash([5,5]);ctx.strokeStyle=C.text;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(x-110,y1);ctx.lineTo(x+40,y1);ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.moveTo(x+52,y1);ctx.lineTo(x+60,y1);ctx.lineTo(x+60,y2);ctx.lineTo(x+52,y2);ctx.stroke();
      txt('缺口',x+70,(y1+y2)/2,{size:17,weight:800,align:'left'});});
    pipe(t,{x:208,y:base-9.4*k-6,r:4},{x:498,y:base-12.2*k-8,r:4},{bend:-90,w:10,show:ap(t,L[2]+1.4,1.2),label:'转移支付',lp:.5});
    card(780,100,420,170,ap(t,L[2]+1.2),()=>{txt('中央对地方转移支付',990,132,{size:17,color:C.muted});
      txt(countUp(t,L[2]+1.5,2,10.42).toFixed(2)+' 万亿元',990,178,{size:38,weight:800,color:C.gold});txt('2026 年预算',990,214,{size:14,color:C.muted});
      A(ap(t,L[2]+5.5),()=>pill('东部  →  中西部、东北',990,246,{size:15,border:C.gold,color:C.gold}));});
  });
  panel(160,90,960,450,ap(t,L[3]),'养老保险全国统筹（2022 年起）',null,()=>{caseTag(1050,120,'真实案例');
    const pool={x:640,y:330,r:60},A1={x:330,y:250,r:40},A2={x:330,y:420,r:40},B1={x:950,y:330,r:46};
    pipe(t,A1,pool,{w:10,bend:-20,show:ap(t,L[3]+7.5,1),label:'结余调入'});pipe(t,A2,pool,{w:10,bend:20,show:ap(t,L[3]+7.8,1)});
    pipe(t,pool,B1,{w:16,show:ap(t,L[3]+9.5,1),label:'补缺口'});
    node(pool,{a:ap(t,L[3]+6.5),color:C.gold,icon:'bank',label:'全国统筹调剂',glow:1});
    node(A1,{a:ap(t,L[3]+7.2),color:C.teal,icon:'house',label:'结余较多的省份'});node(A2,{a:ap(t,L[3]+7.4),color:C.teal,icon:'house',label:'结余较多的省份'});
    node(B1,{a:ap(t,L[3]+2.5),color:C.cn,icon:'house',label:'收不抵支的省份',sub:'老龄化程度高'});});
}
function sLand(t,S){const L=S.L;
  panel(140,76,1000,470,win(t,S.start,L[2]+.3),'国有土地使用权出让收入','单位：万亿元',()=>{
    const D=[['2017',5.2],['2018',6.5],['2019',7.3],['2020',8.4],['2021',8.7],['2022',6.7],['2023',5.8],['2024',4.9],['2025',4.15]];
    const hi=t>L[1]+1?[5,6,7,8]:[4],hc=t>L[1]+1?C.cn:C.gold;
    barChart(t,{x:190,y:160,w:900,h:290,data:D,max:10,at:L[0]+.5,stagger:.35,hi,hiColor:hc,color:t>L[1]+1?'#5b6684':C.gold,fmt:v=>v===4.15?'4.15':v.toFixed(1)});
    const cx=i=>190+900/9*(i+.5);
    A(ap(t,L[0]+5),()=>pill('峰值',cx(4),160+290-290*8.7/10-38,{size:14,bg:C.gold,color:'#2a1d00'}));
    A(ap(t,L[1]+1.5),()=>pill('楼市转冷 · 房企债务危机',cx(5.5),190,{size:14,border:C.cn,color:C.cn}));
    A(ap(t,L[1]+7),()=>{const y1=160+290-290*8.7/10,y2=160+290-290*4.15/10;ctx.setLineDash([5,5]);ctx.strokeStyle=C.text;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(cx(4)+30,y1);ctx.lineTo(cx(8)+50,y1);ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.moveTo(cx(8)+44,y1);ctx.lineTo(cx(8)+50,y1);ctx.lineTo(cx(8)+50,y2);ctx.lineTo(cx(8)+44,y2);ctx.stroke();
      txt('不到峰值一半',cx(8)-10,(y1+y2)/2,{size:15,weight:800,align:'right'});});});
  A(ap(t,L[2]),()=>{const LD={x:250,y:300,r:50},LO={x:640,y:300,r:56},IV={x:1000,y:200,r:46},DB={x:1000,y:420,r:46};
    const s=lerp(20,6,ease(clamp((t-L[2]-.8)/3)));
    pipe(t,LD,LO,{w:s,show:ap(t,L[2]+.3,1),label:'卖地收入'});pipe(t,LO,IV,{w:s*.7,show:ap(t,L[2]+.6,1),label:'投资'});pipe(t,LO,DB,{w:s*.7,show:ap(t,L[2]+.8,1),label:'偿债'});
    node(LD,{a:ap(t,L[2]),color:C.gold,icon:'building',label:'土地出让'});node(LO,{a:ap(t,L[2]),color:C.teal,icon:'gov',label:'地方政府'});
    node(IV,{a:ap(t,L[2]+.4),color:C.muted,icon:'train',label:'基建投资'});node(DB,{a:ap(t,L[2]+.6),color:C.muted,icon:'bank',label:'偿还债务'});});
}
function sDebt(t,S){const L=S.L;
  const X=y=>140+(y-1990)/36*1000,TY=104;
  const ev=[[1994,'预算法：地方不得自行举债',L[1]+.5,-1],[2008,'四万亿投资计划',L[2]+.3,1],[2014,'修订预算法：开“正门”',L[4]+.3,-1],[2022,'遵义道桥债务重组',L[5]+1,1],[2024,'十万亿化债',L[6]+.3,-1]];
  A(ap(t,S.start+.2),()=>{const f=easeOut(clamp((t-S.start-.2)/1.5));ctx.fillStyle=C.line;ctx.fillRect(140,TY-1.5,1000*f,3);
    let cur=-1;ev.forEach((e,i)=>{if(t>=e[2])cur=i;});
    ev.forEach(([y,s,at,side],i)=>{const a=ap(t,at);if(a<=0)return;A(a,()=>{const x=X(y),on=i===cur;
      ctx.beginPath();ctx.arc(x,TY,on?8:5,0,7);ctx.fillStyle=on?C.gold:C.muted;ctx.fill();
      txt(String(y),x,TY+(side<0?-36:20),{size:14,weight:700,color:on?C.gold:C.muted});
      txt(s,x,TY+(side<0?-18:38),{size:14,weight:on?700:500,color:on?C.text:C.muted});});});});
  const focus=Math.max(win(t,L[3],L[4]+.3),win(t,L[5],S.end+2));
  A(1-.985*focus,()=>{
    const CE={x:250,y:310,r:50},LO={x:820,y:310,r:50},INV={x:530,y:485,r:46},CT={x:1060,y:470,r:42},LD={x:1135,y:285,r:38};
    pipe(t,INV,CE,{w:8,show:ap(t,L[0]+2.5,1),label:'国债',lp:.45});
    const open=t<L[1]+2.5?ap(t,L[0]+4.2,1):t<L[4]+1.5?0:ap(t,L[4]+1.5,1.2);
    pipe(t,INV,LO,{w:10,show:Math.max(open,t<L[4]?1-ap(t,L[1]+2.5,.8):0),ca:open,label:'地方政府债',lp:.55});
    A(win(t,L[1]+2.4,L[4]+1.6),()=>{const x=675,y=398;ctx.strokeStyle=C.cn;ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-16,y-16);ctx.lineTo(x+16,y+16);ctx.moveTo(x+16,y-16);ctx.lineTo(x-16,y+16);ctx.stroke();});
    const ctw=t<L[4]+3?lerp(6,17,ap(t,L[2]+1.5,2)):lerp(17,9,ap(t,L[4]+3,2));
    pipe(t,INV,CT,{bend:50,w:ctw,dash:[8,8],color:C.violet,show:ap(t,L[1]+5.5,1),label:'借款',lp:.55});
    pipe(t,CT,LO,{w:ctw*.8,dash:[8,8],color:C.violet,show:ap(t,L[1]+6.2,1),label:'修路建城',lp:.5});
    pipe(t,LD,LO,{w:10,show:ap(t,L[0]+5,1),label:'卖地收入',lp:.5});
    node(CE,{a:ap(t,L[0]+1.2),color:C.gold,icon:'gov',label:'中央财政'});
    node(LO,{a:ap(t,L[0]+1.6),color:C.teal,icon:'gov',label:'地方政府'});
    node(INV,{a:ap(t,L[0]+2.2),color:C.cn,icon:'bank',label:'银行 · 投资者'});
    node(LD,{a:ap(t,L[0]+4.6),color:C.gold,icon:'building',label:'土地出让'});
    node(CT,{a:ap(t,L[1]+5),color:C.violet,icon:'factory',label:'城投公司'});
    A(ap(t,L[2]+3),()=>pill('隐性债务 ↑',1180,400,{size:15,bg:C.violet,color:'#fff'}));
    A(win(t,L[4]+3,L[5]+.3),()=>{ctx.save();ctx.strokeStyle=C.green;ctx.lineWidth=3;ctx.setLineDash([6,6]);ctx.beginPath();ctx.moveTo(930,560);ctx.quadraticCurveTo(760,600,690,470);ctx.stroke();ctx.restore();
      pill('置换成规范债券',820,592,{size:14,bg:C.green,color:'#06210f'});});
  });
  // case: Dushan
  panel(160,150,960,400,win(t,L[3],L[4]+.3),'贵州独山县：小县城的大债务',null,()=>{caseTag(1050,180,'真实案例');
    const x=200,w=860,f=easeOut(clamp((t-L[3]-2)/1.5)),g=easeOut(clamp((t-L[3]-4.5)/2));
    txt('年财政总收入（2019）',x,240,{size:16,color:C.muted,align:'left'});rr(x,256,Math.max(4,w*8.27/400*f),34,6);ctx.fillStyle=C.teal;ctx.fill();
    A(f,()=>txt('约 8.27 亿元',x+w*8.27/400+16,273,{size:20,weight:800,color:C.teal,align:'left'}));
    txt('债务规模',x,330,{size:16,color:C.muted,align:'left'});rr(x,346,w*g,34,6);ctx.fillStyle=C.cn;ctx.fill();
    A(g,()=>txt('超过 400 亿元',x+w*g-16,363,{size:20,weight:800,color:'#fff',align:'right'}));
    A(ap(t,L[3]+7),()=>{pill('债务 ≈ 年收入的 48 倍',420,450,{size:17,bg:C.cn,color:'#fff',padX:16});pill('大多融资成本 > 10%',780,450,{size:17,border:C.gold,color:C.gold,padX:16});});});
  // case: Zunyi
  panel(160,150,960,400,win(t,L[5],L[6]+.3),'遵义道桥：约 156 亿元银行贷款重组（2022 年底）',null,()=>{caseTag(1050,180,'真实案例');
    [['期限','→ 20 年'],['利率','→ 3% ~ 4.5%'],['还款','前 10 年只付息']].forEach(([a,b],i)=>A(ap(t,L[5]+5+i*1.8),()=>{const x=330+i*310;
      rr(x-130,215,260,96,12);ctx.fillStyle=C.panel;ctx.fill();ctx.strokeStyle=C.gold;ctx.lineWidth=1.5;ctx.stroke();
      txt(a,x,242,{size:15,color:C.muted});txt(b,x,280,{size:24,weight:800,color:C.gold});}));
    A(ap(t,L[5]+10),()=>{const x=200,w=880,y=380,f=easeOut(clamp((t-L[5]-10)/1.5));
      txt('20 年还款时间轴',x,y-18,{size:14,color:C.muted,align:'left'});
      rr(x,y,w/2*f,30,6);ctx.fillStyle='rgba(56,194,176,.45)';ctx.fill();rr(x+w/2,y,w/2*clamp(f*2-1),30,6);ctx.fillStyle=C.gold;ctx.fill();
      txt('第 1–10 年：只付利息',x+w/4,y+15,{size:15,weight:700});A(clamp(f*2-1),()=>txt('第 11–20 年：分期还本',x+w*3/4,y+15,{size:15,weight:700,color:'#2a1d00'}));
      A(ap(t,L[5]+12),()=>txt('用时间换空间：短期偿债压力被推后',640,y+62,{size:16,color:C.muted}));});});
  // hidden debt
  panel(160,150,960,400,win(t,L[6],L[7]+.3),'需地方自行消化的隐性债务','单位：万亿元',()=>{
    const base=470,k=17;[[400,14.3,'2023 年末',C.violet,L[6]+5],[880,2.3,'2028 年前目标',C.green,L[6]+7]].forEach(([x,v,l,c,at])=>{const f=easeOut(clamp((t-at)/1.2));
      rr(x-60,base-v*k*f,120,v*k*f,8);ctx.fillStyle=c;ctx.fill();txt(l,x,base+20,{size:15,color:C.muted});A(f,()=>txt(v.toFixed(1),x,base-v*k*f-18,{size:24,weight:800,color:c}));});
    ctx.fillStyle=C.line;ctx.fillRect(260,base,760,1.5);
    A(ap(t,L[6]+7.5),()=>{arrow(480,260,800,400,C.gold,3);pill('10 万亿化债：6 万亿置换 + 4 万亿专项债',640,230,{size:15,bg:C.gold,color:'#2a1d00'});});});
  // explicit debt balance
  panel(160,150,960,400,ap(t,L[7]),'政府债务余额（年末）','单位：万亿元',()=>{
    const yrs=['2018','2019','2020','2021','2022','2023','2024','2025'],G=[14.9,16.8,20.9,23.3,25.9,30.0,34.6,41.2],Lc=[18.4,21.3,25.7,30.5,35.1,40.7,47.5,54.8];
    const x0=220,w=860,base=500,k=2.9,slot=w/8,bw=54;
    rr(184,206,12,12,3);ctx.fillStyle=C.gold;ctx.fill();txt('国债',202,212,{size:14,color:C.muted,align:'left'});
    rr(254,206,12,12,3);ctx.fillStyle=C.teal;ctx.fill();txt('地方政府债',272,212,{size:14,color:C.muted,align:'left'});
    ctx.fillStyle=C.line;ctx.fillRect(x0,base,w,1.5);
    yrs.forEach((y,i)=>{const f=easeOut(clamp((t-L[7]-.5-i*.3)/.8));if(f<=0)return;const bx=x0+i*slot+(slot-bw)/2;
      const hL=Lc[i]*k*f,hG=G[i]*k*f;rr(bx,base-hL,bw,hL,4);ctx.fillStyle=C.teal;ctx.fill();rr(bx,base-hL-hG,bw,hG,4);ctx.fillStyle=C.gold;ctx.fill();
      txt(y,bx+bw/2,base+18,{size:14,color:C.muted});A(clamp(f*2-1),()=>txt(Math.round(G[i]+Lc[i])+'',bx+bw/2,base-hL-hG-13,{size:14,weight:800}));});
    A(ap(t,L[7]+6.5),()=>{pill('2025 年末：国债 ≈ 41',330,262,{size:15,bg:C.gold,color:'#2a1d00'});pill('地方政府债 ≈ 55',330,296,{size:15,bg:C.teal,color:'#04201c'});});});
}
function sSpecial(t,S){const L=S.L;
  A(win(t,S.start,L[1]+.3),()=>{const CE={x:640,y:300,r:66};node(CE,{a:ap(t,S.start+.2),color:C.gold,icon:'gov',label:'中央财政',glow:1});
    A(ap(t,L[0]+1.5),()=>{pill('信用最好',420,300,{size:18,bg:C.gold,color:'#2a1d00',padX:16});pill('借钱成本最低',870,300,{size:18,bg:C.gold,color:'#2a1d00',padX:16});});
    A(ap(t,L[0]+4),()=>txt('→ 特别国债',640,450,{size:26,weight:800,color:C.gold}));});
  panel(140,76,1000,470,win(t,L[1],L[2]+.3),'历次特别国债','单位：万亿元',()=>{
    const D=[['1998',0.27,'银行注资'],['2007',1.55,'组建中投'],['2020',1.0,'抗疫'],['2024',1.0,'超长期'],['2025',1.8,'超长期+注资'],['2026',1.6,'超长期+注资']];
    const ts=[L[1]+.5,L[1]+.9,L[1]+5.2,L[1]+8.5,L[1]+9.3,L[1]+10.1];
    D.forEach(([y,v,s],i)=>{const x0=200,w=880,slot=w/6,bw=74,bx=x0+i*slot+(slot-bw)/2,base=460,f=easeOut(clamp((t-ts[i])/.9));if(f<=0)return;
      const h=v/2*280*f,c=i>=3?C.gold:i===2?C.cn:'#7d88a3';rr(bx,base-h,bw,h,6);ctx.fillStyle=c;ctx.fill();
      txt(y,bx+bw/2,base+18,{size:15,color:C.muted});txt(s,bx+bw/2,base+38,{size:13,color:C.muted});
      A(clamp(f*2-1),()=>txt(v<1?'0.27':v.toFixed(v===1?1:2).replace(/0$/,''),bx+bw/2,base-h-14,{size:16,weight:800}));});
    ctx.fillStyle=C.line;ctx.fillRect(200,460,880,1.5);});
  A(ap(t,L[2]),()=>{const B={x:180,y:300,r:50},SU={x:450,y:300,r:50},CO={x:740,y:300,r:50},FI={x:1050,y:300,r:50};
    pipe(t,B,SU,{w:12,show:ap(t,L[2]+1.5,1),label:'3000 亿元'});pipe(t,SU,CO,{w:12,show:ap(t,L[2]+3,1),label:'补贴'});pipe(t,CO,FI,{w:20,show:ap(t,L[2]+8.5,1.2),label:'购买'});
    node(B,{a:ap(t,L[2]),color:C.gold,icon:'gov',label:'超长期特别国债'});node(SU,{a:ap(t,L[2]+1.5),color:C.teal,icon:'store',label:'以旧换新补贴'});
    node(CO,{a:ap(t,L[2]+3),color:C.violet,icon:'house',label:'消费者'});node(FI,{a:ap(t,L[2]+8.5),color:C.cn,icon:'factory',label:'家电 · 汽车企业'});
    A(ap(t,L[2]+5),()=>{card(390,420,500,110,1,()=>{caseTag(830,446,'2025 年');txt('前八个月带动相关商品销售额',640,450,{size:15,color:C.muted});
      txt('超过 '+countUp(t,L[2]+5.3,2,2).toFixed(0)+' 万亿元',640,494,{size:34,weight:800,color:C.gold});});});});
}
function sRole(t,S){const L=S.L,GV={x:640,y:318,r:66};
  node(GV,{a:ap(t,L[0]),color:C.gold,icon:'gov',label:'政府',glow:1});
  const box=(x,y,num,tt,d1,d2,c,at)=>card(x,y,340,128,ap(t,at),()=>{txt(num+' '+tt,x+22,y+32,{size:23,weight:800,color:c,align:'left'});
    txt(d1,x+22,y+70,{size:16,align:'left'});if(d2)txt(d2,x+22,y+98,{size:14,color:C.muted,align:'left'});});
  const s1=ap(t,L[1]+.6,1);[[400,120],[400,165],[400,210]].forEach(([x,y],i)=>pipe(t,{x,y,r:0},GV,{bend:-30+i*20,w:6,show:s1,ca:.9}));
  box(50,96,'①','收集者','税收、土地出让收入','汇集分散的资金',C.gold,L[1]);
  const s2=ap(t,L[1]+4.6,1);[[880,120],[880,165],[880,210]].forEach(([x,y],i)=>pipe(t,GV,{x,y,r:0},{bend:-10+i*20,w:6,show:s2}));
  box(890,96,'②','分配者','转移支付、社会保障','把钱送到最需要的地方',C.teal,L[1]+4);
  const s3=ap(t,L[2]+.8,1);pipe(t,GV,{x:400,y:455,r:0},{bend:30,w:10,show:s3});
  box(50,396,'③','投资者','专项债、政策性银行','铁路、能源、科技等长期项目',C.cn,L[2]);
  box(890,396,'④','调节者','逆周期调节','与人民银行一起踩油门 / 刹车',C.violet,L[2]+5.8);
  A(ap(t,L[2]+6.2),()=>{const x=800,y=470,dt=Math.max(0,t-L[2]-6.5),sp=Math.sin(dt*1.3);ctx.beginPath();ctx.arc(x,y,38,Math.PI,0);ctx.strokeStyle=C.line;ctx.lineWidth=8;ctx.stroke();
    const an=Math.PI*1.5+sp*Math.PI*.42;ctx.strokeStyle=C.text;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(an)*32,y+Math.sin(an)*32);ctx.stroke();
    txt('刹车',x-58,y-4,{size:13,color:C.teal,weight:700});txt('油门',x+58,y-4,{size:13,color:C.cn,weight:700});
    pipe(t,GV,{x:800,y:425,r:0},{bend:-20,w:5,show:ap(t,L[2]+6.2,1),speed:1+.6*sp});});
}
function sOutro(t,S){const L=S.L,bx=640,by=300;
  const D=[[{x:250,y:170,r:44},'factory','企业的收入',C.teal,L[0]+3],[{x:1030,y:170,r:44},'gov','国库里的税款',C.gold,L[0]+4.3],
           [{x:250,y:450,r:44},'bank','一笔银行贷款',C.cn,L[0]+5.6],[{x:1030,y:450,r:44},'train','一段新修的高铁',C.violet,L[0]+6.8]];
  A(ap(t,S.start+.1),()=>{D.forEach(([n,ic,lb,c,at],i)=>{pipe(t,{x:bx,y:by,r:80},n,{bend:(i%2?1:-1)*40,w:6,show:ap(t,at-.6,1)});node(n,{a:ap(t,at),color:c,icon:ic,label:lb});});
    banknote(bx,by+Math.sin(t*1.3)*4,.52,C.cn);});
  A(ap(t,S.lines[1].end+.5,.8),()=>{ctx.fillStyle='rgba(11,16,32,.86)';ctx.fillRect(0,0,W,H);
    txt('看懂钱的流向，就看懂了社会如何运转',640,250,{size:40,weight:800});
    txt('信用创造 → 家庭与企业循环 → 税收入库 → 央地分成 → 转移支付 → 土地与债务 → 特别国债',640,318,{size:17,color:C.gold});
    txt('数据：人民银行、财政部、全国人大批准的预算报告及公开报道；数字均为近似值，仅作科普',640,400,{size:14,color:C.muted});});
}
const SCENES={intro:sIntro,create:sCreate,loop:sLoop,tax:sTax,transfer:sTransfer,land:sLand,debt:sDebt,special:sSpecial,role:sRole,outro:sOutro};

