
const suits=["c","d","h","s"];
const ranks=["01","02","03","04","05","06","07","08","09","10","11","12","13"];
const handNames=["ハイカード","ワンペア","ツーペア","スリーカード","ストレート","フラッシュ","フルハウス","フォーカード","ストレートフラッシュ"];

let deck,board,players=[],resultData;
let playerCount=2,answered=false;
let hardMode=false,nextHardMode=false;

function startMode(n){
 playerCount=n;
 document.getElementById("home").style.display="none";
 document.getElementById("game").style.display="block";
 document.getElementById("modeTitle").innerText=n+"人モード";
 nextHardMode=false;
 updateHardUI();
 startGame();
}

function backHome(){
 document.getElementById("game").style.display="none";
 document.getElementById("home").style.display="block";
}

function toggleHard(){
 nextHardMode=!nextHardMode;
 updateHardUI();
}

function updateHardUI(){
 const btn=document.getElementById("hardBtn");
 if(nextHardMode){
  btn.classList.add("active");
  btn.innerText="ハード ON";
 }else{
  btn.classList.remove("active");
  btn.innerText="ハード";
 }
}

function createDeck(){
 deck=[];
 for(let s of suits){
  for(let r of ranks){
   deck.push(s+r);
  }
 }
}

function randomCard(){
 return deck.splice(Math.floor(Math.random()*deck.length),1)[0];
}

function renderCards(cards,high){
 return cards.map(c=>{
  const h=high.has(c)?"highlight":"";
  return `<img src="cards/${c}.png" class="card ${h}">`;
 }).join("");
}

function render(high=new Set()){
 document.getElementById("board").innerHTML=renderCards(board,high);

 let html="";
 players.forEach((p,i)=>{
  html+=`
  <div class="player">
    <h3>P${i+1}</h3>
    <div class="row">${renderCards(p,high)}</div>
    ${playerCount===2?"":`<input type="checkbox" class="chk" value="${i}">`}
  </div>`;
 });
 document.getElementById("players").innerHTML=html;

 renderButtons();
 setupClicks();
}

function setupClicks(){
 document.querySelectorAll(".player").forEach((p,i)=>{
  const chk=p.querySelector(".chk");

  if(playerCount===2){
    p.onclick=()=>{
      if(answered) return;
      answerHU(i===0?"p1":"p2");
    };
    return;
  }

  if(!chk) return;
  if(chk.checked) p.classList.add("selected");

  p.onclick=()=>{
    if(answered) return;
    chk.checked=!chk.checked;
    p.classList.toggle("selected",chk.checked);
  };
 });
}

function renderButtons(){
 const area=document.getElementById("buttons");

 if(answered){
  area.innerHTML="";
  return;
 }

 if(playerCount===2){
  area.innerHTML=`<button onclick="answerHU('chop')">チョップ</button>`;
 }else{
  area.innerHTML=`<button onclick="submitAnswer()">解答</button>`;
 }
}

function val(c){let r=parseInt(c.slice(1));return r===1?14:r;}

function combinations(arr,k){
 const res=[];
 function f(s,c){
  if(c.length===k){res.push(c);return;}
  for(let i=s;i<arr.length;i++)f(i+1,c.concat([arr[i]]));
 }
 f(0,[]);
 return res;
}

function evaluate5(cards){
 const v=cards.map(val).sort((a,b)=>b-a);
 const s=cards.map(c=>c[0]);

 const count={};
 v.forEach(x=>count[x]=(count[x]||0)+1);
 const cnt=Object.entries(count).sort((a,b)=>b[1]-a[1]||b[0]-a[0]);

 const flush=s.every(x=>x===s[0]);

 let uniq=[...new Set(v)].sort((a,b)=>a-b);
 if(uniq.includes(14)) uniq.unshift(1);

 let straight=false,high=0;
 for(let i=0;i<=uniq.length-5;i++){
  if(uniq[i]+1===uniq[i+1]&&uniq[i]+2===uniq[i+2]&&uniq[i]+3===uniq[i+3]&&uniq[i]+4===uniq[i+4]){
   straight=true;
   high=uniq[i+4]===1?5:uniq[i+4];
  }
 }

 let rank=0,tb=[];
 if(straight&&flush){rank=8;tb=[high];}
 else if(cnt[0][1]===4){rank=7;tb=[+cnt[0][0],+cnt[1][0]];}
 else if(cnt[0][1]===3&&cnt[1][1]===2){rank=6;tb=[+cnt[0][0],+cnt[1][0]];}
 else if(flush){rank=5;tb=v;}
 else if(straight){rank=4;tb=[high];}
 else if(cnt[0][1]===3){rank=3;tb=[+cnt[0][0],...v.filter(x=>x!=cnt[0][0])];}
 else if(cnt[0][1]===2&&cnt[1][1]===2){
  rank=2;tb=[Math.max(+cnt[0][0],+cnt[1][0]),Math.min(+cnt[0][0],+cnt[1][0]),+cnt[2][0]];
 }
 else if(cnt[0][1]===2){rank=1;tb=[+cnt[0][0],...v.filter(x=>x!=cnt[0][0])];}
 else{rank=0;tb=v;}

 return {rank,tb};
}

function compare(a,b){
 if(a.rank!==b.rank) return a.rank-b.rank;
 for(let i=0;i<Math.max(a.tb.length,b.tb.length);i++){
  const av=a.tb[i]||0,bv=b.tb[i]||0;
  if(av!==bv) return av-bv;
 }
 return 0;
}

function evaluate7(cards){
 const comb=combinations(cards,5);
 let best=null,bestHand=null;

 for(let c of comb){
  const e=evaluate5(c);
  if(!best||compare(e,best)>0){
   best=e;
   bestHand=c;
  }
 }
 return {...best,bestHand};
}

function determineWinner(){
 const evals=players.map(p=>evaluate7(p.concat(board)));
 let best=evals[0];
 let winners=[0];

 for(let i=1;i<evals.length;i++){
  const cmp=compare(evals[i],best);
  if(cmp>0){best=evals[i]; winners=[i];}
  else if(cmp===0){winners.push(i);}
 }
 return {winners,evals};
}

function generateBoard(){
 if(!hardMode){
  return Array.from({length:5},()=>randomCard());
 }

 while(true){
  createDeck();
  let b=[];
  for(let i=0;i<5;i++) b.push(randomCard());

  let values=b.map(c=>parseInt(c.slice(1)));
  let suitsCount={};
  b.forEach(c=>suitsCount[c[0]]=(suitsCount[c[0]]||0)+1);

  let hasPair = values.some(v=>values.filter(x=>x===v).length>=2);
  let flushDraw = Object.values(suitsCount).some(x=>x>=3);

  if(hasPair||flushDraw) return b;
 }
}

function startGame(){
 answered=false;
 hardMode = nextHardMode;

 document.getElementById("result").innerHTML="";
 document.getElementById("nextBtn").style.display="none";

 createDeck();
 board=generateBoard();
 players=[];

 for(let i=0;i<playerCount;i++){
  players.push([randomCard(),randomCard()]);
 }

 resultData=determineWinner();
 render(new Set());
}

function answerHU(choice){
 if(answered) return;
 answered=true;

 document.getElementById("buttons").innerHTML="";

 let correct=resultData.winners;
 let result="chop";
 if(correct.length===1){
  result=correct[0]===0?"p1":"p2";
 }

 showResult(choice===result);
}

function submitAnswer(){
 if(answered) return;
 answered=true;

 document.getElementById("buttons").innerHTML="";

 let checked=[...document.querySelectorAll(".chk:checked")].map(e=>parseInt(e.value));
 let correct=resultData.winners;

 let ok=checked.length===correct.length && checked.every(v=>correct.includes(v));

 showResult(ok);
}

function showResult(ok){
 let res=ok?"✅正解":"❌不正解";
 res+="<br>";

 let high=new Set();
 resultData.winners.forEach(i=>{
  resultData.evals[i].bestHand.forEach(c=>high.add(c));
 });

 render(high);

 resultData.evals.forEach((e,i)=>{
  res+=`P${i+1}：${handNames[e.rank]}<br>`;
 });

 document.getElementById("result").innerHTML=res;
 document.getElementById("nextBtn").style.display="inline-block";
}
