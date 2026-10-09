/* LOGIKA APLIKASI MacroQuest — state disimpan di localStorage (kunci mq_<NIM>) */
const $=s=>document.querySelector(s),A=$('#app');let S=null,TM=0;const PT=[];
const E=s=>String(s??'').replace(/[<>&"]/g,c=>'&#'+c.charCodeAt()+';');
const ORD=[1,2,3,4,5,6,7,'UTS',8,9,10,11,12,13,'UAS'],isB=k=>typeof k=='string';
const title=x=>RK.filter(r=>x>=r[0]).pop()[1],lv=id=>LV.find(l=>l.id==id);
const lt=id=>isB(id)?'Boss '+id:'Level '+id+' – '+lv(id).t;
const sch=k=>CF.sched[k]?new Date(CF.sched[k]):null,locked=k=>{const d=sch(k);return d&&d>new Date(Date.now()+OFF)},fmt=d=>d.toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'});
const saveCF=()=>api('config',{m:'PUT',b:CF}).catch(e=>toast('⚠️ '+e.message));
const opn=k=>{const i=ORD.indexOf(k);return S.role=='dsn'||((!i||S.done.includes(ORD[i-1]))&&!locked(k))};
const today=()=>new Date().toLocaleDateString('id-ID');
const hasGame=L=>L.qb||L.gen||L.case||L.match;
function save(){BG.forEach(b=>{if(b[3](S)&&!S.bd.includes(b[1])){S.bd.push(b[1]);toast('🏅 Badge baru: '+b[1])}});if(S.role=='dsn')return;
 const b={state:S,xp:S.xp,lv:Math.max(0,...S.done.filter(k=>!isB(k))),score:grade(),bd:BG.filter(x=>S.bd.includes(x[1])).map(x=>x[0]).join('')};
 SP=SP.then(()=>api('state',{m:'PUT',b})).catch(()=>toast('⚠️ Gagal menyimpan ke server'))}
function addXP(n){const o=title(S.xp);S.xp+=n;toast('+'+n+' XP ✨');if(title(S.xp)!=o)toast('⬆️ Naik pangkat: '+title(S.xp));save()}
function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;$('#toasts').append(t);setTimeout(()=>t.remove(),2600)}
function confetti(){for(let i=0;i<60;i++){const d=document.createElement('i');d.className='cf';d.style.cssText=`left:${R(0,100)}vw;background:hsl(${R(0,360)},90%,60%);animation-delay:${Math.random()}s`;document.body.append(d);setTimeout(()=>d.remove(),3600)}}
// Bobot nilai akhir: kuis 20% + hitungan 20% + analisis (tugas terkirim) 20% + studi kasus 20% + boss 20%
function grade(s=S){const av=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0,by=c=>LV.filter(l=>l.c==c&&hasGame(l)).map(l=>s.score[l.id]||0),tk=LV.filter(l=>l.f);
 return Math.round(.2*av(by('q'))+.2*av(by('h'))+.2*(tk.filter(l=>s.sub[l.id]).length/tk.length*100)+.2*av(by('k'))+.2*av([s.boss.UTS||0,s.boss.UAS||0]))}
const items=L=>[...(L.qb?QB[L.qb].map(s=>({...Q(s),tag:L.id})):[]),...(L.qb?(TFB[L.id]||[]).map(s=>({...TF(s),tag:L.id})):[]),...(L.gen||[]).map(k=>({...GEN[k](),tag:L.id})),...(L.case?CASES[L.id].map(c=>({...c,tag:L.id,r:1})):[])];
function bossItems(id){const r=id=='UTS'?[1,7]:[8,13],cf=id=='UTS'?[12,8,5,5]:[20,10,5,5],gs=id=='UTS'?['g1','g2','g3','g4']:['gm','gp'],L=LV.filter(l=>l.id>=r[0]&&l.id<=r[1]);
 const pick=(f,n)=>L.flatMap(l=>(f(l.id)||[]).map(x=>({...x,tag:l.id}))).sort(()=>Math.random()-.5).slice(0,n);
 // komposisi [PG, hitungan, B/S, kasus]: UTS 12+8+5+5=30, UAS 20+10+5+5=40
 return [...pick(i=>(QB[i]||[]).map(Q),cf[0]),...Array.from({length:cf[1]},(_,k)=>{const g=gs[k%gs.length];return{...GEN[g](),tag:TG[g]}}),...pick(i=>(TFB[i]||[]).map(TF),cf[2]),...pick(i=>CASES[i],cf[3])]}
// Pemutar soal generik (level & boss)
function run(it,o){let i=0,ok=0,xp=0,fin=0,left=(o.time||0)*60;const bad=new Set();
 if(o.time)TM=setInterval(()=>{left--;const e=$('#tm');if(e)e.textContent='⏱ '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0');if(left<=0){toast('⏰ Waktu habis!');done()}},1000);
 function done(){if(fin)return;fin=1;clearInterval(TM);o.end({p:Math.round(ok/it.length*100),ok,n:it.length,xp,bad:[...bad]})}
 function judge(v,mine){const q=it[i],good=q.o?[].concat(q.a).includes(v):Math.abs(v-q.a)<=Math.max(.01,Math.abs(q.a)*.005),g=good?100:10;
  if(good)ok++;else bad.add(q.tag);if(!o.boss){xp+=g;addXP(g)}
  A.querySelectorAll('#ans button,#ans input,#ans textarea').forEach(e=>e.disabled=1);
  $('#fb').innerHTML=`<div class="fb ${good?'ok':'no'}"><p><b>Jawaban Anda:</b> ${mine}</p><p><b>Jawaban benar:</b> ${q.o?[].concat(q.a).map(k=>q.o[k]).join(' / '):q.a}</p><p><b>Status:</b> ${good?'BENAR ✓ 🎉 Jawaban benar!':'SALAH ✗ ❌ Jawaban belum tepat, periksa kembali persamaan keseimbangan.'} &nbsp; <b>XP:</b> +${o.boss?0:g}</p><h4>Pembahasan</h4>${q.s?'<ol>'+q.s.map(x=>`<li>${x}</li>`).join('')+'</ol>':`<p>${q.e}</p>`}<button class=btn id=nx>${i+1<it.length?'Lanjut':'Lihat Hasil'}</button></div>`;
  $('#nx').onclick=()=>++i<it.length?show():done()}
 function show(){const q=it[i];A.innerHTML=`<div class=card><div class=row><b>Soal ${i+1}/${it.length}</b><span id=tm class=pill></span></div><div class=bar><i style="width:${i/it.length*100}%"></i></div><h3>${q.q}</h3><div id=ans>${q.o?q.o.map((x,k)=>`<button class=opt data-k=${k}>${x}</button>`).join(''):'<input id=num type=number step=any placeholder="Y = ..."><button class=btn id=ky>Kunci Jawaban</button>'}</div><div id=fb></div></div>`;
  if(q.o){let pk=null;A.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{pk=+b.dataset.k;A.querySelectorAll('.opt').forEach(x=>x.classList.toggle('sel',x==b));
   if(q.r&&!o.boss){if(!$('#why')){$('#ans').insertAdjacentHTML('beforeend','<textarea id=why rows=3 placeholder="Tuliskan alasan pilihan Anda..."></textarea><button class=btn id=ky>Kunci Jawaban</button>');$('#ky').onclick=()=>$('#why').value.trim()?judge(pk,q.o[pk]+' — '+E($('#why').value)):toast('Isi alasan dulu')}}
   else judge(pk,b.textContent)})}
  else $('#ky').onclick=()=>{const v=parseFloat($('#num').value);isNaN(v)?toast('Isi jawaban dulu'):judge(v,v)}}
 show()}
function lvlEnd(L,r){const pass=r.p>=60,first=!S.done.includes(L.id);let b=0;S.score[L.id]=Math.max(S.score[L.id]||0,r.p);
 if(L.c=='h'&&r.p==100)S.perfect=1;
 if(pass&&first){S.done.push(L.id);b=500+(r.p==100?1000:0);addXP(b)}
 if(pass&&L.tn&&!L.f&&!S.sub[L.id])S.sub[L.id]={v:{Skor:r.p},nilai:null,fb:'',t:today(),auto:1};
 S.h.push([today(),`${lt(L.id)}: skor ${r.p}`]);save();if(pass)confetti();
 A.innerHTML=`<div class=card><h2>${pass?'🎉 Level Selesai!':'Belum lulus (minimal 60)'}</h2><p>Skor <b>${r.p}</b> (${r.ok}/${r.n} benar) • XP game +${r.xp} • Bonus +${b}</p><p>${r.bad.length?'📖 Pelajari kembali: '+r.bad.map(lt).join(', '):'Sempurna, tidak ada materi yang perlu diulang!'}</p><div class=row><button data-go=lvl data-a=${L.id}>📖 Pelajari Materi / Tugas</button><button class=btn id=ag>🔁 Coba Lagi</button><button data-go=map>🗺 Peta</button></div></div>`;
 $('#ag').onclick=()=>V.lvl(L.id)}
function bossEnd(id,r){const pass=r.p>=70,rk=r.p>=90?'S Rank 🏆':r.p>=80?'A Rank':r.p>=70?'B Rank':r.p>=60?'C Rank':'Remedial';let b=0;S.boss[id]=Math.max(S.boss[id]||0,r.p);
 if(pass&&!S.done.includes(id)){S.done.push(id);b=2000;addXP(b)}
 S.h.push([today(),`Boss ${id}: nilai ${r.p} (${rk})`]);save();if(pass)confetti();
 const rg=id=='UTS'?[1,7]:[8,13],all=LV.filter(l=>l.id>=rg[0]&&l.id<=rg[1]).map(l=>l.id);
 A.innerHTML=`<div class=card><h1>${pass?'👑 BOSS DEFEATED!':'💀 BOSS BELUM TERKALAHKAN'}</h1>${pass?'':'<p>Silakan ulangi level yang nilainya rendah.</p>'}<p>Nilai <b>${r.p}</b> • ${rk} • ${r.ok}/${r.n} benar (${r.p}%) • XP bonus +${b}</p><p>✅ Dikuasai: ${all.filter(t=>!r.bad.includes(t)).map(t=>'L'+t).join(', ')||'-'}</p><p>📖 Perlu dipelajari lagi: ${r.bad.map(lt).join(', ')||'-'}</p><button data-go=map>🗺 Peta</button></div>`}
function match(L){let sel=null,ok=0,w=0,xp=0;const R2=[...MATCH].sort(()=>Math.random()-.5);
 A.innerHTML=`<div class=card><h3>🧩 Cocokkan Tokoh ↔ Teori</h3><div class=mt><div>${MATCH.map((m,i)=>`<button class=opt data-l=${i}>${m[0]}</button>`).join('')}</div><div>${R2.map(m=>`<button class=opt data-r=${MATCH.indexOf(m)}>${m[1]}</button>`).join('')}</div></div><p id=cn></p></div>`;
 A.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{if(b.disabled)return;A.querySelectorAll('[data-l]').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');sel=+b.dataset.l});
 A.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{if(sel==null||b.disabled)return;
  if(+b.dataset.r==sel){ok++;xp+=100;addXP(100);const l=$(`[data-l="${sel}"]`);l.disabled=b.disabled=1;l.classList.add('good');b.classList.add('good');$('#cn').innerHTML+=`✅ <b>${MATCH[sel][0]}</b>: ${MATCH[sel][2]}<br>`;sel=null;if(ok==MATCH.length)lvlEnd(L,{p:Math.round(ok/(ok+w)*100),ok,n:ok+w,xp,bad:w?[5]:[]})}
  else{w++;xp+=10;addXP(10);toast('❌ Belum cocok')}})}
function draw(){const c=$('#cv'),g=c.getContext('2d'),W=c.width,H=c.height,X=u=>40+u/12*(W-60),Y=p=>H-30-p/12*(H-50);g.clearRect(0,0,W,H);g.strokeStyle='#7c8cff';g.fillStyle='#cbd5ff';g.beginPath();g.moveTo(40,10);g.lineTo(40,H-30);g.lineTo(W-10,H-30);g.stroke();g.fillText('Pengangguran (%)',W/2-40,H-8);g.fillText('Inflasi (%)',2,12);
 g.strokeStyle='#38bdf8';g.beginPath();for(let u=1.5;u<=12;u+=.25){const p=Math.min(12,1+9/u);u==1.5?g.moveTo(X(u),Y(p)):g.lineTo(X(u),Y(p))}g.stroke();
 PT.forEach(p=>{g.fillStyle='#fbbf24';g.beginPath();g.arc(X(Math.min(12,p[0])),Y(Math.max(0,Math.min(12,p[1]))),5,0,7);g.fill();g.fillStyle='#fff';g.fillText(`(${p[0]};${p[1]})`,X(Math.min(12,p[0]))+7,Y(Math.max(0,Math.min(12,p[1]))))})}
const RT=/Ringkasan|Analisis|Hasil|Metode|Alasan|Kesimpulan|Permasalahan|Tujuan|Review|Hubungan|Masalah|Refleksi|Jelaskan|Uraian|Pendapat/;
const form=(L,b)=>`<div class=card><h3>📝 ${E(L.tn)}</h3>${L.info?`<p>${E(L.info)}</p>`:''}${b?`<p class=muted>Sudah dikirim ${b.t}${b.nilai!=null?' • Nilai '+b.nilai:''}. Kirim ulang untuk memperbarui.</p>`:''}${L.f.map(x=>`<label>${E(x)}</label>${RT.test(x)?'<textarea class=fi rows=3></textarea>':'<input class=fi>'}`).join('')}<br><button class=btn id=sub>Kirim Tugas</button></div>`;
function submit(L){const v=[...A.querySelectorAll('.fi')].map(e=>e.value.trim());if(v.some(x=>!x))return toast('Lengkapi semua kolom');const first=!S.sub[L.id];
 S.sub[L.id]={v:Object.fromEntries(L.f.map((f,i)=>[f,v[i]])),nilai:null,fb:'',t:today()};S.h.push([today(),'Kirim '+L.tn]);
 if(first)addXP(L.c=='k'?500:300);
 if(!hasGame(L)&&!S.done.includes(L.id)){S.done.push(L.id);addXP(500);confetti()}
 save();toast('✅ Tugas terkirim');V.lvl(L.id)}
const V={
login(){A.innerHTML='<div class="card login"><h1>⚔️ MacroQuest</h1><p>Masuk dengan NIM dan passcode dari dosen</p><input id=i placeholder="NIM" autocomplete=username><input id=p type=password placeholder="Passcode" autocomplete=current-password><button class=btn id=lg>Masuk</button><p class=muted>Dosen: gunakan ID <b>dosen</b>.</p></div>';
 $('#lg').onclick=T(async()=>{boot(await api('login',{m:'POST',b:{nim:$('#i').value.trim(),pass:$('#p').value.trim()}}));go('dash')});$('#p').onkeydown=e=>{if(e.key=='Enter')$('#lg').click()}},
dash(){const g=grade(),pr=Math.round(S.done.length/15*100),nx=ORD.find(k=>!S.done.includes(k)),nt=RK.find(r=>r[0]>S.xp);
 A.innerHTML=`<div class="card hero"><div class=av>${E(S.name[0]).toUpperCase()}</div><div><h2>Halo, ${E(S.name)}!</h2><span class=pill>${title(S.xp)}</span></div></div>
 <div class=grid><div class="card st"><small>XP</small><b>${S.xp}</b></div><div class="card st"><small>Nilai Akhir</small><b>${g}</b></div><div class="card st"><small>Level Selesai</small><b>${S.done.length}/15</b></div><div class="card st"><small>Badge</small><b>${S.bd.length}/8</b></div><div class="card st"><small>Ranking</small><b id=rk>…</b></div></div>
 <div class=card><b>Progress Semester: ${pr}%</b><div class=bar><i style="width:${pr}%"></i></div>${nt?`<small>${nt[0]-S.xp} XP lagi menuju ${nt[1]}</small><br>`:''}${ORD.map(k=>`<span class="chip ${S.done.includes(k)?'d':opn(k)?'o':''}">${isB(k)?'👑 '+k:'L'+k}${S.done.includes(k)?' ✓':''}</span>`).join('→')}</div>
 <div class=row>${nx&&!opn(nx)?`<span class=muted>🕒 ${lt(nx)} dibuka ${fmt(sch(nx))}</span>`:nx?`<button class=btn data-go=${isB(nx)?'boss':'lvl'} data-a=${nx}>▶ Lanjutkan Petualangan</button>`:'<b>🏆 Economics Master!</b>'}</div>`;SP.then(()=>api('leaderboard')).then(r=>{const i=r.findIndex(x=>x.nim==S.nim);if($('#rk'))$('#rk').textContent=i<0?'-':'#'+(i+1)}).catch(()=>{})},
map(){A.innerHTML='<h2>🗺 Peta Petualangan</h2><div class=map>'+ORD.map(k=>{const d=S.done.includes(k),o=opn(k);return `<button class="node ${d?'d':o?'o':''} ${isB(k)?'boss':''}" ${o?`data-go=${isB(k)?'boss':'lvl'} data-a=${k}`:'disabled'}><span>${isB(k)?'👑':d?'✅':o?'🟢':locked(k)?'🕒':'🔒'}</span><b>${isB(k)?'BOSS '+k:'Level '+k}</b><small>${locked(k)?'Dibuka '+fmt(sch(k)):isB(k)?(k=='UTS'?'Materi L1–7':'Materi L8–13'):lv(k).t}</small></button>`}).join('')+'</div>'},
lvl(id){const L=lv(id),pl=hasGame(L),u=S.done.includes(id),b=S.sub[id];
 A.innerHTML=`<h2>Level ${id} – ${L.t}</h2><div class=card><h3>📖 Materi</h3><p>${L.m}</p></div>`+(pl?`<div class=card><h3>🎮 ${L.gl}</h3><p class=muted>Lulus ≥ 60 • benar +100 XP, salah +10 XP • selesai +500 XP, sempurna +1.000 XP</p><button class=btn id=go>${u?'Main Lagi':'Mulai Game'}</button></div>`:'')+(id==12?'<div class=card><h3>📈 Kurva Phillips Interaktif</h3><div class=row><input id=pu type=number step=any placeholder="Pengangguran (%)"><input id=pi type=number step=any placeholder="Inflasi (%)"><button id=pl>Plot Titik</button></div><canvas id=cv width=520 height=300></canvas></div>':'')+(L.f?(u||!pl?form(L,b):'<p class=muted>🔒 Lulus game untuk membuka tugas.</p>'):'');
 if($('#go'))$('#go').onclick=()=>L.match?match(L):run(items(L),{end:r=>lvlEnd(L,r)});
 if(id==12){draw();$('#pl').onclick=()=>{const u=parseFloat($('#pu').value),p=parseFloat($('#pi').value);if(isNaN(u)||isNaN(p))return toast('Isi kedua nilai');PT.push([u,p]);draw()}}
 if($('#sub'))$('#sub').onclick=()=>submit(L)},
boss(id){const N=id=='UTS'?30:40,T=id=='UTS'?30:45;A.innerHTML=`<div class=card><h1>👑 Boss ${id}</h1><h3>The Macroeconomics Challenge – ${id}</h3><p>${N} soal (${id=='UTS'?'12 PG, 8 hitungan, 5 B/S, 5 kasus':'20 PG, 10 hitungan, 5 B/S, 5 kasus'}) • ${T} menit • Materi Level ${id=='UTS'?'1–7':'8–13'} • Lulus ≥ 70 • Selesai +2.000 XP</p><button class=btn id=go>⚔ Mulai Bertarung</button></div>`;$('#go').onclick=()=>run(bossItems(id),{boss:1,time:T,end:r=>bossEnd(id,r)})},
async lb(){A.innerHTML='<h2>🏅 Leaderboard</h2><p class=muted>Memuat data…</p>';try{await SP;const r=await api('leaderboard');A.innerHTML=`<h2>🏅 Leaderboard</h2><div class=card style="overflow:auto"><table><tr><th>Rank<th>Nama<th>XP<th>Level<th>Score<th>Badge</tr>${r.map((x,i)=>`<tr class="${x.nim==S.nim?'me':''}"><td>${['🥇','🥈','🥉'][i]||''} ${i+1}<td>${E(x.name)}<td>${x.xp}<td>Level ${x.lv}<td>${x.score}<td>${E(x.bd)||'-'}</tr>`).join('')||'<tr><td colspan=6>Belum ada peserta.'}</table></div><small>Diurutkan dari XP tertinggi. Score = nilai akhir. Data diambil langsung dari server.</small>`}catch(e){toast('⚠️ '+e.message)}},
tasks(){SP.then(()=>api('state')).then(d=>{if(d.state&&JSON.stringify(d.state.sub)!=JSON.stringify(S.sub)){S.sub=d.state.sub;V.tasks()}}).catch(()=>{});A.innerHTML=`<h2>📝 My Assignments</h2><div class=card style="overflow:auto"><table><tr><th>Tugas<th>Level<th>Deadline<th>Status<th>Nilai<th>Feedback dosen</tr>${LV.filter(l=>l.tn).map(l=>{const b=S.sub[l.id];return `<tr data-go=lvl data-a=${l.id}><td>${E(l.tn)}<td>${l.id}<td>${l.dl?new Date(l.dl+'T00:00').toLocaleDateString('id-ID',{dateStyle:'medium'}):'Minggu '+(l.id+1)}<td>${b?(b.nilai!=null?'🟢 Selesai':'🟡 Belum dinilai'):'🔴 Belum dikerjakan'}<td>${b?.nilai??'-'}<td>${E(b?.fb||'-')}</tr>`}).join('')}</table></div>`},
prof(){A.innerHTML=`<h2>👤 Profil</h2><div class=card><p><b>${E(S.name)}</b> • NIM ${E(S.nim)} • Kelas ${E(S.kelas||'-')} • ${S.role=='dsn'?'Dosen':'Mahasiswa'}</p><p>XP ${S.xp} • ${title(S.xp)} • Nilai akhir ${grade()} • Progress ${Math.round(S.done.length/15*100)}%</p><p>Badge: ${S.bd.join(', ')||'-'}</p><small>Bobot nilai: kuis 20% • hitungan 20% • analisis 20% • studi kasus 20% • boss 20%</small></div><div class=card><h3>Riwayat (permainan & tugas)</h3>${S.h.slice(-12).reverse().map(x=>`<p>${x[0]} — ${E(x[1])}</p>`).join('')||'-'}</div><button id=out>Keluar</button>`;$('#out').onclick=()=>{localStorage.removeItem('mqtok');location.reload()}},
ach(){A.innerHTML='<h2>🎖 Achievement</h2><div class=grid>'+BG.map(b=>`<div class="card st ${b[3](S)?'':'lk2'}"><span style=font-size:2rem>${b[0]}</span><b>${b[1]}</b><small>${b[2]}</small></div>`).join('')+'</div>'},
dosen(t='peserta'){A.innerHTML=`<h2>🎓 Dashboard Dosen</h2><div class=row><div>${[['peserta','👥 Peserta'],['tugas','📝 Tugas'],['level','🗓 Level & Quiz'],['nilai','✅ Penilaian']].map(x=>`<button class="${x[0]==t?'btn':''}" data-go=dosen data-a=${x[0]}>${x[1]}</button>`).join(' ')}</div></div><div id=dt></div><p class=muted>Perubahan tersimpan di server dan langsung berlaku untuk semua mahasiswa.</p>`;Promise.resolve(D[t]()).catch(e=>toast('⚠️ '+e.message))}};
const ES={nim:null,task:null,lv:1,q:null};
const D={
async peserta(){const rs=await api('roster'),e=(ES.nim&&rs.find(x=>x.nim==ES.nim))||{},R_=()=>V.dosen('peserta'),u=encodeURIComponent;
 $('#dt').innerHTML=`<div class=card style="overflow:auto"><h3>Data Peserta (${rs.length})</h3><table><tr><th>NIM<th>Nama<th>Kelas<th>Passcode<th>XP<th>Level<th></tr>${rs.map(r=>{const n=E(r.nim);return `<tr><td>${n}<td>${E(r.name)}<td>${E(r.kelas)}<td><code>${E(r.pass)}</code><td>${r.xp??'-'}<td>${r.lv??'-'}<td><button data-e="${n}">Edit</button> <button data-r="${n}">Reset</button> <button data-x="${n}">Hapus</button></tr>`}).join('')||'<tr><td colspan=7>Belum ada peserta.'}</table></div>
 <div class=card><h3>${e.nim?'Edit':'Tambah'} Peserta</h3><div class=row><input id=rn placeholder=NIM value="${E(e.nim)}"><input id=rm placeholder=Nama value="${E(e.name)}"><input id=rk placeholder=Kelas value="${E(e.kelas)}"><input id=rp placeholder="Passcode (kosong = acak)" value="${E(e.pass)}"><button class=btn id=rs>Simpan</button></div></div>
 <div class=card><h3>Impor Massal</h3><textarea id=ri rows=4 placeholder="Satu baris per mahasiswa: NIM,Nama,Kelas,Passcode"></textarea><button id=rb>Impor</button></div>
 <div class=card><h3>Passcode Dosen</h3><div class=row><input id=dp type=password placeholder="Passcode dosen baru (min. 6 karakter)"><button id=ds>Ubah</button></div></div>`;
 $('#rs').onclick=T(async()=>{await api('roster',{m:'POST',b:{old:ES.nim,nim:$('#rn').value.trim(),name:$('#rm').value.trim(),kelas:$('#rk').value.trim(),pass:$('#rp').value.trim()}});ES.nim=null;toast('Peserta tersimpan');R_()});
 $('#rb').onclick=T(async()=>{const d=await api('roster/bulk',{m:'POST',b:$('#ri').value.split('\n').map(l=>l.split(',').map(x=>x.trim())).filter(r=>r[0]&&r[1])});toast(d.n+' peserta diimpor');R_()});
 $('#ds').onclick=T(async()=>{await api('dosen/pass',{m:'POST',b:{pass:$('#dp').value.trim()}});toast('Passcode dosen diubah')});
 A.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{ES.nim=b.dataset.e;R_()});
 A.querySelectorAll('[data-r]').forEach(b=>b.onclick=T(async()=>{if(confirm('Reset progres peserta ini?')){await api('roster/'+u(b.dataset.r)+'/reset',{m:'POST'});R_()}}));
 A.querySelectorAll('[data-x]').forEach(b=>b.onclick=T(async()=>{if(confirm('Hapus peserta ini?')){await api('roster/'+u(b.dataset.x),{m:'DELETE'});R_()}}))},
tugas(){const id=ES.task,L=id&&lv(id);
 $('#dt').innerHTML=`<div class=card style="overflow:auto"><h3>Daftar Tugas</h3><table><tr><th>Level<th>Tugas<th>Deadline<th>Kolom<th></tr>${LV.map(l=>`<tr><td>${l.id} – ${l.t}<td>${E(l.tn||'—')}<td>${l.dl||'-'}<td>${l.f?l.f.length:0}<td><button data-t=${l.id}>${l.tn?'Edit':'Tambah'}</button></tr>`).join('')}</table></div>`+(L?`<div class=card><h3>${L.tn?'Edit':'Tambah'} Tugas – Level ${id}</h3><label>Nama tugas</label><input id=tn value="${E(L.tn)}"><label>Deadline</label><input id=td type=date value="${L.dl||''}"><label>Petunjuk untuk mahasiswa</label><textarea id=ti rows=2>${E(L.info)}</textarea><label>Kolom isian (satu per baris)</label><textarea id=tf rows=6>${E((L.f||[]).join('\n'))}</textarea><div class=row><button class=btn id=tsv>Simpan</button><button id=tdel>Hapus Tugas</button></div></div>`:'');
 A.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ES.task=+b.dataset.t;V.dosen('tugas')});
 if(L){$('#tsv').onclick=()=>{const f=$('#tf').value.split('\n').map(x=>x.trim()).filter(Boolean),n=$('#tn').value.trim();if(!n||!f.length)return toast('Nama tugas dan minimal 1 kolom wajib diisi');CF.tasks[id]={tn:n,f,dl:$('#td').value,info:$('#ti').value.trim()};Object.assign(L,CF.tasks[id]);saveCF();ES.task=null;toast('Tugas tersimpan');V.dosen('tugas')};
  $('#tdel').onclick=()=>{if(!hasGame(L))return toast('Level ini hanya berisi tugas: ubah, jangan dihapus');CF.tasks[id]={tn:'',f:null,dl:'',info:''};Object.assign(L,CF.tasks[id]);saveCF();ES.task=null;V.dosen('tugas')}}},
level(){const l=ES.lv,qs=QB[l]||[],eq=ES.q,e=eq!=null?Q(qs[eq]):null;
 $('#dt').innerHTML=`<div class=card style="overflow:auto"><h3>Jadwal Pembukaan Level</h3><small>Level terbuka bila level sebelumnya selesai <b>dan</b> jadwal sudah lewat. Kosongkan = langsung terbuka.</small><table>${ORD.map(k=>`<tr><td>${lt(k)}<td><input type=datetime-local class=sc data-k=${k} value="${CF.sched[k]||''}"></tr>`).join('')}</table><button class=btn id=ssv>Simpan Jadwal</button></div>
 <div class=card><h3>Kelola Quiz per Level</h3><select id=ql>${LV.map(x=>`<option value=${x.id} ${x.id==l?'selected':''}>Level ${x.id} – ${x.t}`).join('')}</select>${qs.map((q,i)=>`<p><small>${i+1}.</small> ${E(q.split('|')[0])} <button data-qe=${i}>Edit</button> <button data-qd=${i}>Hapus</button></p>`).join('')||'<p class=muted>Belum ada soal pilihan ganda.</p>'}<small>Soal tampil di game level bertipe kuis dan di pool Boss.</small></div>
 <div class=card><h3>📤 Upload Soal dari Excel</h3><p class=muted>Kolom: Level (1–13), Pertanyaan, Opsi A–D, Jawaban (A/B/C/D), Pembahasan.</p><div class=row><input type=file id=xf accept=".xlsx"><button id=xt>⬇ Unduh Template</button></div><label><input type=checkbox id=xo style="width:auto"> Timpa semua soal pada level yang ada di file</label><button class=btn id=xu>Upload & Tambahkan</button></div>
 <div class=card><h3>${e?'Edit':'Tambah'} Soal</h3><textarea id=qq rows=2 placeholder=Pertanyaan>${E(e?.q)}</textarea>${[0,1,2,3].map(i=>`<input class=qo placeholder="Opsi ${'ABCD'[i]}" value="${E(e?.o[i])}">`).join('')}<select id=qa>${[0,1,2,3].map(i=>`<option value=${i} ${e&&e.a==i?'selected':''}>Jawaban benar: ${'ABCD'[i]}`).join('')}</select><input id=qe placeholder=Pembahasan value="${E(e?.e)}"><button class=btn id=qs>Simpan Soal</button></div>
 <div class=card><h3>Ubah Materi Level ${l}</h3><textarea id=mt rows=3>${E(CF.mat[l]||lv(l).m)}</textarea><button class=btn id=ms>Simpan Materi</button></div>`;
 const sv=()=>{CF.bank=QB;saveCF()};
 $('#xu').onclick=T(async()=>{const f=$('#xf').files[0];if(!f)return toast('Pilih file .xlsx dulu');const fd=new FormData();fd.append('file',f);const d=await api('questions/parse',{m:'POST',b:fd});
  if($('#xo').checked)new Set(d.items.map(x=>x.l)).forEach(k=>QB[k]=[]);d.items.forEach(x=>(QB[x.l]=QB[x.l]||[]).push(x.s));sv();toast(d.items.length+' soal ditambahkan'+(d.errors.length?', '+d.errors.length+' baris dilewati':''));
  if(d.errors.length)alert('Baris dilewati:\n'+d.errors.join('\n'));V.dosen('level')});
 $('#xt').onclick=T(async()=>{const r=await fetch('/api/template.xlsx'),a=document.createElement('a');a.href=URL.createObjectURL(await r.blob());a.download='template_soal.xlsx';a.click()});
 $('#ql').onchange=()=>{ES.lv=+$('#ql').value;ES.q=null;V.dosen('level')};
 $('#ssv').onclick=()=>{A.querySelectorAll('.sc').forEach(i=>{i.value?CF.sched[i.dataset.k]=i.value:delete CF.sched[i.dataset.k]});saveCF();toast('Jadwal tersimpan')};
 A.querySelectorAll('[data-qe]').forEach(b=>b.onclick=()=>{ES.q=+b.dataset.qe;V.dosen('level')});
 A.querySelectorAll('[data-qd]').forEach(b=>b.onclick=()=>{if(confirm('Hapus soal ini?')){qs.splice(+b.dataset.qd,1);ES.q=null;sv();V.dosen('level')}});
 $('#qs').onclick=()=>{const c=t=>t.replace(/\|/g,'/').trim(),o=[...A.querySelectorAll('.qo')].map(x=>c(x.value)),q=c($('#qq').value);if(!q||o.some(v=>!v))return toast('Lengkapi soal dan 4 opsi');const z=[q,...o,$('#qa').value,c($('#qe').value)||'-'].join('|');if(!QB[l])QB[l]=[];e?QB[l][eq]=z:QB[l].push(z);ES.q=null;sv();toast('Soal tersimpan');V.dosen('level')};
 $('#ms').onclick=()=>{const t=$('#mt').value.trim();if(!t)return toast('Isi teks materi');CF.mat[l]=t;lv(l).m=E(t);saveCF();toast('Materi diperbarui')}},
async nilai(){const st=(await api('states')).map(x=>x.state);$('#dt').innerHTML=`<div class=card style="overflow:auto"><h3>Rekap Nilai</h3><table><tr><th>Nama<th>NIM<th>XP<th>Level selesai<th>Nilai<th>UTS<th>UAS</tr>${st.map(s=>`<tr><td>${E(s.name)}<td>${E(s.nim)}<td>${s.xp}<td>${s.done.length}/15<td>${grade(s)}<td>${s.boss.UTS??'-'}<td>${s.boss.UAS??'-'}</tr>`).join('')||'<tr><td colspan=7>Belum ada data pengerjaan di browser ini.'}</table></div><div class=card><h3>Tugas masuk</h3>${st.flatMap(s=>Object.entries(s.sub).map(([id,b])=>`<div><hr><b>${E(s.name)}</b> – ${E(lv(id).tn||'Tugas Level '+id)}<br><small>${E(Object.values(b.v).join(' • ').slice(0,200))}</small><div class=row><input class=n type=number placeholder=Nilai value="${b.nilai??''}"><input class=f placeholder=Feedback value="${E(b.fb)}"><button data-n="${s.nim}" data-i=${id}>Simpan</button></div></div>`)).join('')||'Belum ada tugas.'}</div>`;
 A.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{const d=b.parentNode,n=parseFloat(d.querySelector('.n').value);api('grade',{m:'POST',b:{nim:b.dataset.n,id:b.dataset.i,nilai:isNaN(n)?null:n,fb:d.querySelector('.f').value}}).then(()=>toast('Tersimpan')).catch(e=>toast('⚠️ '+e.message))})}};
function nav(){const N=$('#nav');if(!S){N.innerHTML='';return}
 N.innerHTML=`<b data-go=dash>⚔️ MacroQuest</b><span class=pill>${S.xp} XP</span><button class=hb id=hb>☰</button><nav class=lk>${[['dash','🏠 Beranda'],['map','🗺 Peta'],['lb','🏅 Leaderboard'],['tasks','📝 Tugas'],['prof','👤 Profil'],['ach','🎖 Achievement'],...(S.role=='dsn'?[['dosen','🎓 Dosen']]:[])].map(x=>`<button data-go=${x[0]}>${x[1]}</button>`).join('')}</nav>`;$('#hb').onclick=()=>N.classList.toggle('open')}
function go(v,a){clearInterval(TM);if(!S)v='login';a=isNaN(a)?a:+a;if((v=='lvl'||v=='boss')&&!opn(a)){toast('🔒 Belum terbuka'+(locked(a)?' — dibuka '+fmt(sch(a)):''));v='map'}nav();V[v](a);scrollTo(0,0)}
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g&&!g.disabled)go(g.dataset.go,g.dataset.a)});
let TOK=localStorage.getItem('mqtok')||'',OFF=0,SP=Promise.resolve(),CF={tasks:{},sched:{},mat:{},bank:null};
async function api(p,o={}){const f=o.b instanceof FormData,r=await fetch('/api/'+p,{method:o.m||'GET',headers:{...(TOK?{Authorization:'Bearer '+TOK}:{}),...(o.b&&!f?{'Content-Type':'application/json'}:{})},body:o.b?(f?o.b:JSON.stringify(o.b)):undefined}),d=await r.json().catch(()=>({}));
 if(r.status==401&&p!='login'){TOK='';localStorage.removeItem('mqtok');S=null;go('login')}
 if(!r.ok)throw Error(d.error||'Kesalahan server');return d}
function T(f){return async(...a)=>{try{await f(...a)}catch(e){toast('⚠️ '+e.message)}}}
function boot(d){TOK=d.token||TOK;localStorage.setItem('mqtok',TOK);OFF=d.now-Date.now();const u=d.user;
 S=d.state||{xp:0,done:[],score:{},boss:{},sub:{},bd:[],h:[],perfect:0};Object.assign(S,{nim:u.nim,name:u.name,kelas:u.kelas,role:u.role});
 CF=d.config;['tasks','sched','mat'].forEach(k=>CF[k]=CF[k]||{});
 Object.entries(CF.tasks).forEach(([i,t])=>Object.assign(lv(i),t));Object.entries(CF.mat).forEach(([i,t])=>lv(i).m=E(t));
 if(CF.bank){Object.assign(QB,CF.bank);CF.bank=QB}}
if(TOK)api('session').then(d=>{boot(d);go('dash')}).catch(()=>go('login'));else go('login');
