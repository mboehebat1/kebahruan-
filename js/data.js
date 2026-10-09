/* DATA & GENERATOR SOAL — edit file ini untuk menambah soal, level, XP, dll. */
const R=(a,b)=>Math.floor(Math.random()*(b-a+1))+a,P=a=>a[R(0,a.length-1)],F=n=>Math.round(n*100)/100;
const RK=[[0,'Novice Economist'],[1000,'Junior Economist'],[3000,'Economic Analyst'],[6000,'Senior Economist'],[10000,'Master Economist']];
// Generator hitungan (jawaban dihitung otomatis dari parameter acak)
const sec=n=>()=>{const a=R(5,20)*10,b=P([.6,.7,.75,.8]),I=R(10,40)*10,G=n>2?R(10,30)*10:0,T=n>2?R(5,20)*10:0,X=n>3?R(10,30)*10:0,M=n>3?R(5,15)*10:0,k=a-b*T+I+G+X-M,y=F(k/(1-b));
 return{q:`C = ${a} + ${b}${n>2?'Yd':'Y'}; I = ${I}${n>2?`; G = ${G}; T = ${T}`:''}${n>3?`; X = ${X}; M = ${M}`:''}. Tentukan pendapatan keseimbangan Y.`,a:y,
 s:[`Y = C + I${n>2?' + G':''}${n>3?' + (X − M)':''}${n>2?', dengan Yd = Y − T':''}`,`Y(1 − ${b}) = ${a}${n>2?` − ${b}(${T})`:''} + ${I}${n>2?` + ${G}`:''}${n>3?` + ${X} − ${M}`:''} = ${F(k)}`,`Y = ${F(k)} / ${F(1-b)} = ${y}`]}};
const GEN={
g1(){const C=R(30,90)*10,I=R(10,40)*10,G=R(10,30)*10,X=R(10,30)*10,M=R(5,25)*10,a=C+I+G+X-M;return{q:`Konsumsi Rp${C}T, investasi Rp${I}T, belanja pemerintah Rp${G}T, ekspor Rp${X}T, impor Rp${M}T. Hitung GDP (Rp triliun) dengan pendekatan pengeluaran.`,a,s:['Y = C + I + G + (X − M)',`Y = ${C} + ${I} + ${G} + (${X} − ${M}) = ${a}`]}},
g2:sec(2),g3:sec(3),g4:sec(4),
gm(){const b=R(10,50)*10,r=P([5,10,20]),a=b*100/r;return{q:`Uang primer Rp${b}T dan giro wajib minimum ${r}%. Hitung jumlah uang beredar (Rp triliun).`,a,s:[`Multiplier uang = 1 / GWM = 1 / ${r/100} = ${100/r}`,`M = ${b} × ${100/r} = ${a}`]}},
gp(){const e=R(2,6),u=R(4,7),h=P([.5,1,1.5]),x=R(3,9),a=F(e-h*(x-u));return{q:`Kurva Phillips: π = ${e} − ${h}(u − ${u}). Jika pengangguran u = ${x}%, berapa inflasi π (%)?`,a,s:[`π = ${e} − ${h}(${x} − ${u})`,`π = ${e} − ${F(h*(x-u))} = ${a}%`]}}};
const TG={g1:1,g2:2,g3:3,g4:4,gm:8,gp:12};
// Pilihan ganda: 'soal|opsiA|opsiB|opsiC|opsiD|indeksBenar(0-3)|pembahasan'
const Q=s=>{const p=s.split('|');return{q:p[0],o:p.slice(1,5),a:+p[5],e:p[6]}};
const QB={
1:['GDP berbeda dengan GNP karena GDP menghitung...|output di dalam wilayah negara|output warga negara di mana pun|hanya barang ekspor|hanya jasa|0|GDP berbasis wilayah; GNP berbasis kepemilikan faktor produksi (kewarganegaraan).',
'NNP diperoleh dari GNP dikurangi...|pajak langsung|penyusutan (depresiasi)|subsidi|transfer payment|1|NNP = GNP − penyusutan.',
'Disposable income adalah...|pendapatan sebelum pajak|personal income dikurangi pajak langsung|NNI|GDP per kapita|1|DI = Personal Income − pajak langsung.'],
6:['Marginal Efficiency of Capital (MEC) adalah...|suku bunga pasar|tingkat pengembalian yang diharapkan dari tambahan investasi|besarnya tabungan|rasio kapital-output|1|Investasi dilakukan selama MEC > suku bunga.',
'Jika suku bunga naik, investasi cenderung...|naik|turun|tetap|tidak berhubungan|1|Biaya pinjaman naik sehingga proyek layak berkurang.',
'Prinsip akselerator menyatakan investasi bergantung pada...|perubahan output|tingkat pajak|jumlah ekspor|inflasi saja|0|I = v × ΔY.',
'Berikut yang BUKAN faktor penentu investasi:|ekspektasi keuntungan|suku bunga|stabilitas politik|selera musik|3|Investasi dipengaruhi ekspektasi, bunga, dan kondisi ekonomi-politik.'],
9:['Komponen permintaan agregat adalah...|C + I + G + (X − M)|C + S + T|M × V|W + R + i + π|0|AD = C + I + G + NX.',
'Kurva AD bergeser ke kanan jika...|belanja pemerintah naik|pajak naik|suku bunga naik tajam|ekspor turun|0|Kenaikan G menambah pengeluaran agregat pada setiap tingkat harga.',
'Kurva AD miring negatif karena...|kenaikan harga menurunkan kekayaan riil dan ekspor neto|harga naik menambah output|upah kaku|produktivitas turun|0|Efek kekayaan, suku bunga, dan nilai tukar.'],
10:['Kurva LRAS berbentuk...|vertikal pada output potensial|horizontal|miring ke kanan atas|miring ke kiri|0|Jangka panjang output ditentukan faktor produksi dan teknologi.',
'Kenaikan upah nominal menggeser SRAS ke...|kiri|kanan|tidak bergeser|atas saja|0|Biaya produksi naik sehingga penawaran turun.',
'Kenaikan produktivitas menggeser LRAS ke...|kanan|kiri|tetap|bawah|0|Output potensial meningkat.']};
// Studi kasus: a = indeks jawaban yang dianggap tepat (boleh lebih dari satu)
const CASES={
7:[{q:'Inflasi meningkat dan daya beli masyarakat menurun. Pemerintah mempertimbangkan perubahan pajak dan belanja pemerintah. Kebijakan fiskal apa yang paling tepat?',o:['Menaikkan pajak','Menurunkan pajak','Meningkatkan belanja pemerintah','Mengurangi belanja pemerintah'],a:[0,3],e:'Inflasi akibat permintaan berlebih ditangani dengan kebijakan fiskal kontraktif: pajak naik atau belanja turun untuk menekan AD.'}],
8:[{q:'Inflasi mencapai 8% dan melampaui target. Bank sentral ingin mengendalikan harga. Langkah moneter apa yang tepat?',o:['Menaikkan suku bunga acuan','Menurunkan suku bunga acuan','Membeli surat berharga (operasi pasar terbuka)','Menurunkan GWM'],a:[0],e:'Moneter kontraktif: suku bunga naik, jual surat berharga, atau GWM naik untuk menekan uang beredar.'}],
11:[{q:'Berita simulasi: PHK di sektor manufaktur meningkatkan pengangguran terbuka, sementara upah minimum naik 6%. Apa masalah utamanya?',o:['Pengangguran siklikal/struktural akibat melemahnya permintaan','Pengangguran friksional semata','Kenaikan produktivitas','Kelebihan lowongan kerja'],a:[0],e:'PHK massal saat permintaan melemah mencerminkan pengangguran siklikal dan struktural.'}]};
const MATCH=[['Keynes','Absolute Income Hypothesis','Konsumsi ditentukan pendapatan disposabel saat ini'],['Duesenberry','Relative Income Hypothesis','Konsumsi dipengaruhi pendapatan relatif terhadap orang lain'],['Modigliani','Life Cycle Hypothesis','Konsumsi dihaluskan sepanjang siklus hidup'],['Friedman','Permanent Income Hypothesis','Konsumsi bergantung pendapatan permanen (jangka panjang)']];
const FT=['Judul presentasi','Nama anggota','Permasalahan','Analisis','Kebijakan yang dipilih','Alasan','Kesimpulan'],
FJ=['Judul jurnal','Penulis','Tahun','Link/DOI','Tujuan penelitian','Metode','Hasil','Kesimpulan','Hubungan dengan materi'],
FA=['Judul artikel','Sumber','Link artikel','Ringkasan','Analisis hubungan dengan materi'],
FB=['Judul berita','Media','Tanggal','Link','Ringkasan','Masalah ekonomi','Analisis','Kesimpulan'];
// c: q=kuis, h=hitungan, k=studi kasus, a=analisis | qb/gen/case/match = jenis game | tn/f = tugas & kolom form
const LV=[
{id:1,t:'Pendapatan Nasional',c:'q',gl:'Kuis + Analisis Artikel',qb:1,gen:['g1','g1'],tn:'Tugas 1 – Ringkasan Artikel',f:FA,m:'GDP/PDB = nilai barang & jasa akhir di dalam wilayah negara; GNP = GDP + pendapatan faktor neto dari luar negeri; NNP = GNP − penyusutan; NNI = NNP − pajak tidak langsung; Disposable Income = Personal Income − pajak langsung. Tiga pendekatan: produksi, pendapatan, pengeluaran (Y = C + I + G + X − M).'},
{id:2,t:'Keseimbangan 2 Sektor',c:'h',gl:'Soal Hitungan',gen:Array(5).fill('g2'),tn:'Tugas 3 – Jawaban Latihan',m:'Y = C + I; C = a + bY; S = −a + (1 − b)Y. Y* = (a + I)/(1 − b). Multiplier k = 1/(1 − b) = 1/MPS.'},
{id:3,t:'Keseimbangan 3 Sektor',c:'h',gl:'Soal Hitungan',gen:Array(5).fill('g3'),tn:'Jawaban Latihan Level 3',m:'Y = C + I + G; C = a + b(Y − T). Y* = (a − bT + I + G)/(1 − b).'},
{id:4,t:'Keseimbangan 4 Sektor',c:'h',gl:'Soal Hitungan',gen:Array(5).fill('g4'),tn:'Jawaban Latihan Level 4',m:'Y = C + I + G + (X − M). Ekspor neto = X − M. Y* = (a − bT + I + G + X − M)/(1 − b).'},
{id:5,t:'Teori Konsumsi',c:'q',gl:'Mencocokkan Teori',match:1,tn:'Tugas 8 – Review Data',f:['Judul data/artikel','Sumber','Ringkasan data','Review & kaitannya dengan teori konsumsi'],m:'Keynes: konsumsi bergantung pendapatan saat ini. Duesenberry: pendapatan relatif. Modigliani: siklus hidup. Friedman: pendapatan permanen.'},
{id:6,t:'Teori Investasi',c:'q',gl:'Kuis Konsep',qb:6,tn:'Tugas 9 – Review Data',f:['Judul data/artikel','Sumber','Ringkasan data','Review & kaitannya dengan teori investasi'],m:'Investasi dipengaruhi suku bunga, MEC (expected return), ekspektasi, dan pendapatan. Investasi dilakukan selama MEC > bunga. Akselerator: I = v × ΔY.'},
{id:7,t:'Kebijakan Fiskal',c:'k',gl:'Studi Kasus',case:1,tn:'Tugas 5 – Presentasi Kebijakan Fiskal',f:FT,m:'Kebijakan fiskal mengatur pajak (T) dan belanja pemerintah (G). Ekspansif (G naik / T turun) saat resesi; kontraktif (G turun / T naik) saat inflasi. Multiplier G = 1/(1 − b); multiplier pajak = −b/(1 − b).'},
{id:8,t:'Kebijakan Moneter',c:'k',gl:'Studi Kasus',case:1,tn:'Tugas 6 – Presentasi Kebijakan Moneter',f:FT,m:'Kebijakan moneter mengatur uang beredar & suku bunga lewat operasi pasar terbuka, GWM, dan suku bunga diskonto. Ekspansif: bunga/GWM turun, beli surat berharga. Kontraktif: sebaliknya. Multiplier uang = 1/GWM.'},
{id:9,t:'Permintaan Agregat',c:'q',gl:'Kuis',qb:9,tn:'Tugas 12 – Ringkasan Jurnal',f:FJ,m:'AD = C + I + G + (X − M). Kurva AD miring negatif (efek kekayaan, suku bunga, kurs). Bergeser oleh perubahan C, I, G, NX, serta kebijakan fiskal dan moneter.'},
{id:10,t:'Penawaran Agregat',c:'q',gl:'Kuis',qb:10,tn:'Tugas 13 – Ringkasan Jurnal',f:FJ,m:'SRAS miring positif (upah & harga input kaku); LRAS vertikal di output potensial, ditentukan faktor produksi, produktivitas, dan teknologi. Kenaikan upah/biaya menggeser SRAS ke kiri.'},
{id:11,t:'Pasar Tenaga Kerja',c:'k',gl:'Studi Kasus Berita',case:1,tn:'Tugas 14 – Ringkasan Berita',f:FB,m:'Permintaan (produktivitas marjinal) dan penawaran tenaga kerja menentukan upah. Pengangguran: friksional, struktural, siklikal. Upah minimum dan produktivitas memengaruhi kesempatan kerja.'},
{id:12,t:'Inflasi & Pengangguran',c:'h',gl:'Soal Hitungan',gen:Array(5).fill('gp'),tn:'Tugas 15/16 – Presentasi',f:FT,m:'Inflasi = (IHK₁ − IHK₀)/IHK₀ × 100%. Pengangguran = penganggur/angkatan kerja × 100%. Kurva Phillips: π = πe − h(u − un); saat u = un (natural rate) inflasi = ekspektasi.'},
{id:13,t:'Pertumbuhan & Pembangunan',c:'a',tn:'Tugas 17 – Ringkasan Artikel',f:FA,m:'Pertumbuhan = kenaikan PDB riil; pembangunan mencakup kualitas hidup, pemerataan, dan keberlanjutan. GDP per kapita = GDP/penduduk. Pendorong: modal fisik & manusia, teknologi, produktivitas. Isu: ketimpangan.'}];
const BG=[['🎯','First Step','Selesaikan Level 1',s=>s.done.includes(1)],['🧮','Math Master','Nilai sempurna soal hitungan',s=>s.perfect],['📚','Article Hunter','Kirim 3 analisis artikel/jurnal/berita',s=>Object.values(s.sub).filter(b=>!b.auto).length>=3],['💰','Fiscal Expert','Selesaikan Level 7',s=>s.done.includes(7)],['🏦','Monetary Expert','Selesaikan Level 8',s=>s.done.includes(8)],['📈','Macro Analyst','Selesaikan Level 13',s=>s.done.includes(13)],['👑','UTS Champion','Kalahkan Boss UTS',s=>s.done.includes('UTS')],['🏆','Economics Master','Kalahkan Boss UAS',s=>s.done.includes('UAS')]];
const DUM=[['Ahmad',9500,13,95],['Budi',8900,12,90],['Citra',8500,11,88],['Dewi',6200,9,84],['Eko',3400,6,79]];
/* ===== PEMBARUAN: bank soal diperluas + Benar/Salah + soal kasus untuk Boss ===== */
// Benar/Salah: 'pernyataan|0=Benar,1=Salah|pembahasan'
const TF=s=>{const p=s.split('|');return{q:'Benar atau salah? '+p[0],o:['Benar','Salah'],a:+p[1],e:p[2]}};
const TFB={
1:['GDP menghitung output warga negara di mana pun berada|1|Itu definisi GNP; GDP berbasis wilayah.','Disposable income adalah personal income dikurangi pajak langsung|0|DI = PI − pajak langsung.'],
5:['Menurut Friedman, konsumsi bergantung pada pendapatan permanen|0|Permanent Income Hypothesis.'],
6:['Kenaikan suku bunga cenderung meningkatkan investasi|1|Bunga naik → biaya naik → investasi turun.','Investasi layak dilakukan bila MEC lebih besar dari suku bunga|0|MEC > bunga.'],
7:['Kebijakan fiskal ekspansif dilakukan dengan menaikkan pajak|1|Ekspansif: pajak turun atau belanja naik.'],
8:['Menaikkan GWM mengurangi jumlah uang beredar|0|Kemampuan kredit bank berkurang.','Operasi pasar terbuka adalah kebijakan fiskal|1|OPT termasuk kebijakan moneter.'],
9:['Kurva AD miring ke bawah|0|Harga naik → permintaan agregat turun.'],
10:['Kurva LRAS vertikal pada output potensial|0|Output jangka panjang ditentukan faktor produksi.'],
11:['Pengangguran friksional bersifat sementara|0|Terjadi saat berpindah atau mencari kerja.'],
12:['Kurva Phillips jangka pendek memiliki slope positif|1|Slope negatif: ada trade-off inflasi–pengangguran.']};
QB[1].push('Pendekatan pengeluaran menghitung GDP dengan menjumlahkan...|C + I + G + (X − M)|upah + sewa + bunga + laba|nilai tambah semua sektor|pajak + subsidi|0|Pendekatan pengeluaran: Y = C + I + G + (X − M).',
'Pendekatan pendapatan menjumlahkan...|upah, sewa, bunga, dan laba|konsumsi dan investasi|nilai tambah sektor|ekspor dan impor|0|Balas jasa faktor produksi: upah + sewa + bunga + laba.',
'Nilai tambah (value added) dipakai pada pendekatan...|produksi|pengeluaran|moneter|fiskal|0|Pendekatan produksi menjumlahkan nilai tambah tiap sektor untuk menghindari double counting.');
QB[6].push('Menurut prinsip akselerator, jika ΔY = 100 dan v = 3 maka investasi sebesar...|33|103|300|97|2|I = v × ΔY = 3 × 100 = 300.',
'Investasi akan dilakukan jika...|MEC lebih besar dari suku bunga|MEC lebih kecil dari suku bunga|suku bunga nol|tabungan nol|0|Proyek layak bila MEC melampaui biaya dana (suku bunga).');
QB[9].push('Penurunan pajak penghasilan cenderung menggeser kurva AD ke...|kanan|kiri|tidak bergeser|vertikal|0|Pendapatan disposabel naik sehingga konsumsi dan AD meningkat.',
'Manakah yang menggeser kurva AD?|perubahan ekspektasi konsumen|perubahan tingkat harga umum|pergerakan di sepanjang kurva|tidak ada|0|Perubahan harga hanya menggerakkan titik di sepanjang kurva.');
QB[10].push('Kenaikan harga minyak (biaya input) menggeser SRAS ke...|kiri|kanan|tidak berubah|menjadi vertikal|0|Biaya produksi naik sehingga penawaran turun (cost-push).',
'Faktor yang menggeser LRAS adalah...|kemajuan teknologi|perubahan harga umum|ekspektasi inflasi sesaat|pajak sementara|0|Output potensial ditentukan teknologi, modal, dan tenaga kerja.');
// Soal tambahan untuk pool Boss UAS (level yang game-nya studi kasus/hitungan)
QB[8]=['Untuk menekan inflasi, bank sentral dapat...|menaikkan suku bunga acuan|menurunkan GWM|membeli surat berharga|menurunkan suku bunga|0|Moneter kontraktif mengurangi uang beredar.',
'Operasi pasar terbuka berarti bank sentral...|membeli/menjual surat berharga|menetapkan pajak|menetapkan upah|mengatur ekspor|0|Beli surat berharga menambah uang beredar; jual menguranginya.',
'Penurunan giro wajib minimum (GWM) akan...|menambah kemampuan bank menyalurkan kredit|mengurangi uang beredar|menaikkan suku bunga|tidak berpengaruh|0|GWM turun → kredit naik → uang beredar bertambah.',
'Kebijakan moneter ekspansif ditandai dengan...|suku bunga turun|pajak naik|belanja pemerintah turun|GWM naik|0|Ekspansif: bunga turun, GWM turun, beli surat berharga.'];
QB[11]=['Pengangguran akibat pergantian pekerjaan yang sementara disebut...|friksional|struktural|siklikal|musiman|0|Friksional terjadi saat mencari pekerjaan baru.',
'Pengangguran akibat resesi disebut...|siklikal|friksional|struktural|sukarela|0|Siklikal: permintaan agregat turun saat resesi.',
'Upah minimum di atas upah keseimbangan cenderung...|menambah pengangguran|menurunkan upah|menaikkan kesempatan kerja|tidak berpengaruh|0|Permintaan tenaga kerja turun sehingga muncul kelebihan penawaran.'];
QB[12]=['Tingkat pengangguran dihitung dengan...|penganggur / angkatan kerja × 100%|penganggur / penduduk × 100%|angkatan kerja / penduduk × 100%|bekerja / penganggur × 100%|0|Tingkat pengangguran = penganggur / angkatan kerja × 100%.',
'Kurva Phillips jangka pendek menunjukkan hubungan...|negatif inflasi dan pengangguran|positif inflasi dan pengangguran|inflasi dan ekspor|pajak dan inflasi|0|Trade-off jangka pendek: inflasi tinggi, pengangguran rendah.',
'Pada natural rate of unemployment, inflasi aktual...|sama dengan inflasi ekspektasi|selalu nol|selalu negatif|tak terbatas|0|Saat u = un, π = πe.'];
CASES[7].push({q:'Ekonomi sedang resesi dengan pengangguran tinggi. Kebijakan fiskal apa yang tepat?',o:['Meningkatkan belanja pemerintah','Menaikkan pajak','Mengurangi belanja pemerintah','Menahan seluruh pengeluaran'],a:[0],e:'Resesi ditangani dengan kebijakan fiskal ekspansif: belanja naik atau pajak turun untuk mendorong AD.'});
CASES[8].push({q:'Ekonomi lesu dan kredit seret. Bank sentral ingin menggairahkan ekonomi. Langkah yang tepat?',o:['Menurunkan suku bunga dan GWM','Menaikkan suku bunga','Menjual surat berharga','Menaikkan GWM'],a:[0],e:'Moneter ekspansif: bunga dan GWM turun agar kredit dan uang beredar bertambah.'});
CASES[11].push({q:'Berita simulasi: produktivitas pekerja naik 5%, upah riil naik, dan lowongan kerja bertambah. Dampaknya?',o:['Kesempatan kerja dan upah cenderung meningkat','Pengangguran pasti naik','Upah riil turun','Permintaan tenaga kerja turun'],a:[0],e:'Produktivitas marjinal naik menggeser permintaan tenaga kerja ke kanan.'});
CASES[12]=[{q:'Inflasi 9% dan pengangguran 4%, jauh di bawah natural rate 6%. Ekonomi terindikasi...',o:['Overheating (permintaan berlebih)','Resesi dalam','Deflasi','Keseimbangan jangka panjang'],a:[0],e:'u di bawah natural rate disertai inflasi tinggi menandakan ekonomi terlalu panas.'}];
CASES[1]=[{q:'GDP suatu negara lebih besar dari GNP-nya karena banyak perusahaan asing beroperasi di dalam negeri. Kesimpulan yang tepat?',o:['Pendapatan faktor neto dari luar negeri negatif','Pendapatan faktor neto dari luar negeri positif','Penyusutan sama dengan nol','Impor lebih besar dari ekspor'],a:[0],e:'GNP = GDP + pendapatan faktor neto dari luar negeri; GDP > GNP berarti nilainya negatif.'}];
CASES[5]=[{q:'Seorang karyawan menerima bonus sesaat dan menabungnya, sementara konsumsinya stabil sepanjang tahun. Teori yang paling menjelaskan?',o:['Permanent Income Hypothesis (Friedman)','Absolute Income Hypothesis (Keynes)','Relative Income Hypothesis (Duesenberry)','Tidak ada teori yang sesuai'],a:[0],e:'Pendapatan transitori ditabung; konsumsi mengikuti pendapatan permanen.'}];
CASES[6]=[{q:'Suku bunga turun dari 10% ke 6% sementara ekspektasi laba proyek tetap. Dampaknya pada investasi?',o:['Investasi naik karena lebih banyak proyek dengan MEC > bunga','Investasi turun','Investasi tidak berubah','Tabungan naik drastis'],a:[0],e:'Bunga turun → lebih banyak proyek layak → investasi meningkat.'}];
