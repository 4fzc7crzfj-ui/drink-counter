/* Last Drinks at the Moist Wombat — party app. No server: everything lives in the link + localStorage. */
(function(){
'use strict';
var DK='MoistWombat31', TK='WOMBAT';
function u8(s){return new TextEncoder().encode(s)}
function dec(b64){var s=atob(b64),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i)^DK.charCodeAt(i%DK.length);return JSON.parse(new TextDecoder().decode(u))}
var D=dec(window.MM_DATA), CH={};
D.chars.forEach(function(c){CH[c.id]=c});
var CORE=D.chars.filter(function(c){return c.core}).map(function(c){return c.id});
var OPT_ORDER=[20,17,19,18,21,22]; // scaling cheat-sheet: Vivienne, Sam, Lorenzo, Sienna, Ghost, Theo
var ROUND_NAMES=['','Who Hated Beau?','Who Could Get In?',"Who's Lying?"];
var WORDS=['SCHOONER','PARMY','BUNDY','COASTER','JUKEBOX','SHANDY','STUBBY','ESKY','LAMINGTON','PAVLOVA','TINNIE','MOZZIE','DUNNY','YOBBO','GOON','SAUSAGEROLL','MEATPIE','BOGAN','GALAH','DROPBEAR'];

/* ---------- tiny helpers ---------- */
function $(s,r){return (r||document).querySelector(s)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function fnv(s){var h=0x811c9dc5;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h>>>0}
function rng(seed){var a=fnv(seed);return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function lsGet(k,d){try{var v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function ssGet(k){try{return sessionStorage.getItem(k)}catch(e){return null}}
function ssSet(k,v){try{sessionStorage.setItem(k,v)}catch(e){}}
function b64u(bytes){var s='';for(var i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64u(t){t=t.replace(/-/g,'+').replace(/_/g,'/');while(t.length%4)t+='=';var s=atob(t),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
function tok(str){var b=u8(str);for(var i=0;i<b.length;i++)b[i]^=TK.charCodeAt(i%TK.length)^(i*7&255);return b64u(b)}
function untok(t){try{var b=unb64u(t);for(var i=0;i<b.length;i++)b[i]^=TK.charCodeAt(i%TK.length)^(i*7&255);return new TextDecoder().decode(b)}catch(e){return null}}
function maskOf(ids){var m=0;ids.forEach(function(i){m|=(1<<(i-1))});return (m>>>0).toString(36)}
function idsOf(mask){var m=parseInt(mask,36)>>>0,out=[];for(var i=1;i<=22;i++)if(m&(1<<(i-1)))out.push(i);return out}
function newSeed(){var s='';var a='abcdefghjkmnpqrstuvwxyz23456789';var r=new Uint8Array(6);(window.crypto||{}).getRandomValues?crypto.getRandomValues(r):r.forEach(function(_,i){r[i]=Math.random()*256});for(var i=0;i<6;i++)s+=a[r[i]%a.length];return s}
function codes(seed){var R=rng('codes|'+seed),w=WORDS.slice();for(var i=w.length-1;i>0;i--){var j=Math.floor(R()*(i+1));var t=w[i];w[i]=w[j];w[j]=t}
  return [null,w[0]+(10+Math.floor(R()*90)),w[1]+(10+Math.floor(R()*90)),w[2]+(10+Math.floor(R()*90))]}
function norm(s){return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'')}
function baseUrl(){return location.href.split('#')[0].split('?')[0]}
function unlocked(seed){return lsGet('mm_u_'+seed,0)}
function setUnlocked(seed,n){lsSet('mm_u_'+seed,n)}
function toast(msg){var t=$('#toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(function(){t.classList.add('hidden')},2200)}
function modal(html){var m=$('#modal');m.innerHTML=html;m.classList.remove('hidden');m.scrollTop=0;document.body.classList.add('noscroll')}
function closeModal(){var m=$('#modal');m.classList.add('hidden');m.innerHTML='';document.body.classList.remove('noscroll')}
function ask(msg,yesLabel,fn){ask.fn=fn;modal('<div class="box"><p style="font-size:19px">'+msg+'</p><div class="row"><button class="btn dark" data-a="close">Cancel</button><button class="btn red" data-a="askyes">'+esc(yesLabel)+'</button></div></div>')}
function copy(text){
  function fb(){var ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.top='-1000px';document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,text.length);var ok=false;try{ok=document.execCommand('copy')}catch(e){}document.body.removeChild(ta);toast(ok?'Copied!':'Copy failed — long-press the link to copy')}
  if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(text).then(function(){toast('Copied!')},fb)}else fb()}
function share(title,text,url){if(navigator.share){navigator.share({title:title,text:text,url:url}).catch(function(e){if(e&&e.name!=='AbortError')copy(url)})}else copy(url)}
function qrSvg(text){try{var q=qrcode(0,'M');q.addData(text);q.make();return q.createSvgTag({cellSize:6,margin:2,scalable:true})}catch(e){return '<p style="color:#000">QR failed — use Copy instead.</p>'}}
function wrapTables(h){return h.replace(/<table/g,'<div class="tw"><table').replace(/<\/table>/g,'</table></div>')}
function render(html,wide){var a=$('#app');a.className=wide?'wide':'';a.innerHTML=html}

/* ---------- state ---------- */
var H=lsGet('mm_host',null); // {pin, seed, cast}
var view={}; // transient UI state
function saveH(){lsSet('mm_host',H)}
function hostOk(){return H&&H.pin&&ssGet('mm_hostok')===H.pin}

/* ---------- routing ---------- */
function route(){
  closeModal();
  var h=location.hash.replace(/^#/,'');
  if(h.indexOf('p=')===0)return player(h.slice(2));
  if(h.indexOf('b=')===0)return board(h.slice(2));
  if(h==='board')return H?board(tok(H.seed+'.'+maskOf(H.cast))):landing();
  if(h==='host')return host();
  landing();
}
window.addEventListener('hashchange',route);
window.addEventListener('storage',function(e){if(e.key&&e.key.indexOf('mm_u_')===0)route()});
function go(h){if(location.hash==='#'+h)route();else location.hash=h}

/* ---------- landing ---------- */
function landing(){
  var last=lsGet('mm_last',null),lastName='';
  if(last){var p=parseP(last);if(p)lastName=CH[p.id].name}
  render('<div class="tag">A Halloween murder mystery · 16–22 grown-ass adults</div>'+
  '<h1 class="title">Last Drinks<br>at the<br>Moist Wombat</h1>'+
  '<div class="sub">Beau\'s Halloween Booze-Fest · one dead publican · zero RSA</div><div class="drip"></div>'+
  '<div class="panel stack">'+
  (lastName?'<a class="btn green block" href="#p='+esc(last)+'">🩸 Back to my card: '+esc(lastName)+'</a>':'')+
  '<p class="center muted">Playing? Open the private link (or scan the QR) your host gave you. Don\'t go poking around the host bit — it has the answer in it.</p>'+
  '<button class="btn block" data-a="gohost">🔒 I\'m the host</button>'+
  (H?'<a class="btn dark block" href="#board">📺 Evidence Board (TV)</a>':'')+
  '</div>');
}

/* ---------- host ---------- */
function host(){
  if(!H||!H.pin){
    render('<h1 class="title">Host Setup</h1><div class="panel stack"><p class="sec hot"><b>⚠ Host only.</b> This dashboard contains the full solution. Pick a PIN so nobody at the party can wander in.</p>'+
    '<label class="lbl">Choose a PIN (4+ digits)</label><input id="pin1" type="password" inputmode="numeric" autocomplete="off" maxlength="12">'+
    '<label class="lbl">Type it again</label><input id="pin2" type="password" inputmode="numeric" autocomplete="off" maxlength="12">'+
    '<div class="err" id="perr"></div><button class="btn block" data-a="setpin">Set PIN &amp; open dashboard</button><a class="btn ghost block" href="#">Back</a></div>');
    return;
  }
  if(!hostOk()){
    render('<h1 class="title">Host</h1><div class="panel stack"><label class="lbl">Enter host PIN</label><input id="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="12">'+
    '<div class="err" id="perr"></div><button class="btn block" data-a="unlock">Unlock</button>'+
    '<button class="btn ghost block sm" data-a="forgot">Forgot PIN?</button><a class="btn dark block sm" href="#">Back</a></div>');
    setTimeout(function(){var i=$('#pin');if(i)i.focus()},50);
    return;
  }
  hostDash();
}
function hashPin(p){return 'h'+fnv('mmpin|'+p).toString(36)}
var TABS=[['links','👥 Cast & Links'],['codes','🔑 Round Codes'],['g0','Guide'],['g2','Running Order'],['g1','Casting'],['g3','Scripts'],['g4','Solution'],['g5','Logic & Awards'],['clues','🧾 Clue Cards'],['more','⚙ Settings']];
function hostDash(){
  var t=view.tab||'links',body='';
  if(t==='links')body=hostLinks();
  else if(t==='codes')body=hostCodes();
  else if(t==='clues')body=hostClues();
  else if(t==='more')body=hostMore();
  else{var gi=+t.slice(1),g=D.guide[gi],sp=(gi>=3);
    var inner='<div class="guide">'+wrapTables(g.html)+'</div>';
    body=sp&&!view['rev'+gi]?'<div class="panel veil on"><div class="vb"><button class="btn" data-a="reveal" data-id="'+gi+'">👀 Tap to reveal (spoilers)</button></div><div class="vc">'+inner+'</div></div>':'<div class="panel">'+inner+'</div>';}
  render('<div class="topbar hostbar"><div class="hb1"><div class="t">Host Dashboard</div><button class="btn sm dark" data-a="lock">🔒 Lock</button></div>'+
    '<div class="tabs">'+TABS.map(function(x){return '<button class="'+(x[0]===t?'on':'')+'" data-a="tab" data-id="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div></div>'+body);
  var on=document.querySelector('.tabs .on');if(on&&on.scrollIntoView)try{on.scrollIntoView({block:'nearest',inline:'center'})}catch(e){}
}
function playerUrl(id){return baseUrl()+'#p='+tok(H.seed+'.'+id+'.'+maskOf(H.cast))}
function boardUrl(){return baseUrl()+'#b='+tok(H.seed+'.'+maskOf(H.cast))}
function hostLinks(){
  var n=H.cast.length;
  var rows=D.chars.map(function(c){
    var on=H.cast.indexOf(c.id)>=0,fixed=c.core;
    return '<div class="crow"><div class="num">'+(c.extra?'+':c.id)+'</div>'+
      '<button class="toggle '+(on?'on ':'')+(fixed?'fixed':'')+'" data-a="cast" data-id="'+c.id+'" aria-label="in play"></button>'+
      '<div class="nm"><b>'+esc(c.name)+'</b><small>'+(c.extra?'Bonus walk-on':(c.core?'Core':'Optional — cuttable'))+' · '+c.title+'</small></div></div>'+
      (on?'<div class="row" style="padding:0 0 10px 0"><button class="btn sm" data-a="qr" data-id="'+c.id+'">▦ QR</button><button class="btn sm green" data-a="share" data-id="'+c.id+'">📤 Share</button><button class="btn sm dark" data-a="copy" data-id="'+c.id+'">📋 Copy</button><button class="btn sm ghost" data-a="peek" data-id="'+c.id+'">👁 Card</button></div>':'');
  }).join('');
  return '<div class="panel"><div class="row" style="align-items:center"><div class="count">'+n+' in play</div></div>'+
   '<p class="small muted">Roles 1–16 are core and always in. Optional roles (17–20) can be cut in any order; add the bonus walk-ons (Ghost of Beau, Theo) for 21–22 guests. Cheat-sheet: 17 = + Vivienne · 18 = + Sam Cuffs · 19 = + Lorenzo · 20 = + Sienna · 21 = + Ghost · 22 = + Theo. If Constable Cuffs is cut, the host reads the "we\'re locking the doors" line.</p>'+
   '<p class="small"><b>Send each link privately</b> (DM, not the group chat) or let each guest scan their QR. The link only opens that one character. Settle the cast before sending links — links made earlier keep working, but their accusation list uses the old cast.</p>'+
   rows+'<hr><button class="btn dark block" data-a="copyall">📋 Copy all links (for your notes)</button></div>';
}
function hostCodes(){
  var C=codes(H.seed),u=unlocked(H.seed),out='';
  for(var r=1;r<=3;r++){
    var cl=D.clues.filter(function(x){return x.r===r}).map(function(x){return '<li><b>'+x.n+'. '+esc(x.title)+'</b> → '+(x.hid?esc(CH[x.hid].name):'HOST reads aloud')+'</li>'}).join('');
    out+='<div class="codebox"><div class="lbl">Round '+r+' — '+ROUND_NAMES[r]+'</div><div class="c">'+C[r]+'</div>'+
    '<p class="small muted">Read this out at the start of Round '+r+'. Players type it in to unlock their Round '+r+' objective and clues.</p>'+
    '<ul style="text-align:left" class="small">'+cl+'</ul>'+
    (u>=r?'<div class="muted">✅ Unlocked on this device\'s Evidence Board</div>':'<button class="btn sm" data-a="hunlock" data-id="'+r+'">Unlock Round '+r+' on this device</button>')+'</div>';
  }
  return '<div class="panel"><p class="small">Codes are unique to this game. Everyone types the code into their own phone, so nobody can peek ahead.</p><div class="codes">'+out+'</div></div>'+
  '<div class="panel stack"><span class="lbl">📺 Evidence Board</span><p class="small">Open this on the TV / laptop. It shows the clues for every round unlocked so far (type the round code on it, or open it on this device and use the buttons above).</p>'+
  '<div class="row"><a class="btn" href="#board" >Open here</a><button class="btn dark" data-a="bqr">▦ QR</button><button class="btn dark" data-a="bcopy">📋 Copy link</button></div>'+
  '<button class="btn ghost block sm" data-a="relock">Re-lock all rounds on this device</button></div>';
}
function clueHtml(x,showHolder){return '<div class="clue"><div class="cn">ROUND '+x.r+' · CLUE '+x.n+'</div><h4>'+x.title+'</h4>'+(showHolder?'<div class="holder">Give to: '+x.holder+'</div>':'')+x.body+'</div>'}
function hostClues(){var o='';for(var r=1;r<=3;r++){o+='<h2 class="cname" style="font-size:34px;margin-top:20px">Round '+r+'</h2>'+D.clues.filter(function(x){return x.r===r}).map(function(x){return clueHtml(x,true)}).join('')}return '<div>'+o+'</div>'}
function hostMore(){return '<div class="panel stack"><span class="lbl">Settings</span>'+
  '<button class="btn dark block" data-a="chpin">Change PIN</button>'+
  '<button class="btn dark block" data-a="newgame">New game (new links &amp; codes)</button>'+
  '<p class="small muted">"New game" makes fresh links and round codes — any links already sent stop working. Game id: '+esc(H.seed)+'</p>'+
  '<a class="btn ghost block" href="#">Home</a></div>'}

/* ---------- player ---------- */
function parseP(t){var s=untok(t);if(!s)return null;var p=s.split('.');if(p.length!==3)return null;var id=+p[1];if(!CH[id]||!/^[a-z0-9]{4,10}$/.test(p[0]))return null;return {seed:p[0],id:id,cast:idsOf(p[2]),t:t}}
function cardHtml(c){
  if(c.extra)return '<div class="panel"><div class="cname">'+esc(c.name)+'</div><div class="ctitle">“'+c.title+'”</div><div class="pills"><span class="o">Bonus walk-on role</span></div><div class="sec">'+c.text+'</div><div class="foot">'+D.rule+'</div></div>';
  var k=c.k;
  return '<div class="panel'+(k?' killer':'')+'"><div class="cname">'+esc(c.name)+'</div><div class="ctitle">“'+c.title+'”</div>'+
  '<div class="pills"><span>'+c.g+'</span>'+(c.core?'<span>Core</span>':'<span class="o">Optional — cuttable</span>')+(k?'<span class="o">★ The murderer ★</span>':'')+'</div>'+
  '<div class="sec"><span class="lbl">Costume</span>'+c.costume+'</div>'+
  '<div class="sec"><span class="lbl">Personality</span>'+c.pers+'</div>'+
  '<div class="hideable"><div class="sec"><span class="lbl">'+(k?'The truth':'Your story')+'</span>'+c.story+'</div>'+
  '<div class="sec dash"><span class="lbl">'+(k?'What you did':'Your secret')+'</span>'+c.secret+'</div>'+
  '<div class="sec dash"><span class="lbl">Your motive (why people will suspect you)</span>'+c.motive+'</div>'+
  '<div class="sec hot"><span class="lbl">'+(k?'Where you REALLY were — and your cover story':'Where you were 10:40–11:00pm (THE TRUTH)')+'</span>'+c.where+'</div>'+
  '<div class="sec"><span class="lbl">What you know about others</span><ul>'+c.knows.map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul></div>'+
  '<div class="sec"><span class="lbl">🍻 Bonus dare</span>'+c.bonus+'</div>'+
  '<div class="foot">'+(k?D.krule:D.rule)+'</div></div></div>';
}
function player(t){
  var p=parseP(t);
  if(!p){render('<h1 class="title">Dodgy link</h1><div class="panel center"><p>That link\'s been through the wash. Ask the host to send it again.</p><a class="btn" href="#">Home</a></div>');return}
  lsSet('mm_last',t);
  var c=CH[p.id],C=codes(p.seed),u=unlocked(p.seed),veiled=view.veil;
  if(view.accuse)return accuseView(p);
  var rounds='';
  if(!c.extra){for(var r=1;r<=3;r++){
    var open=u>=r,inner;
    if(open){
      var mine=D.clues.filter(function(x){return x.r===r&&(x.hid===c.id||(r===1&&!x.hid))});
      inner='<span class="lbl">Your Round '+r+' objective</span><div>'+c.r[r-1]+'</div>'+
      (mine.length?'<hr><span class="lbl">'+(r===1?'Evidence':'Your evidence — when the host calls your name, read it aloud to the room (it also shows on the Evidence Board)')+'</span>'+mine.map(function(x){return clueHtml(x,!x.hid)}).join(''):'');
    }else inner='<div class="lock">🔒 Locked. The host will read out the Round '+r+' code.</div><div class="codein" style="margin-top:10px"><input id="code'+r+'" placeholder="ROUND '+r+' CODE" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="btn" data-a="pcode" data-id="'+r+'">Unlock</button></div><div class="err" id="cerr'+r+'"></div>';
    rounds+='<div class="round'+(open?' open':'')+'"><h3><span>Round '+r+' — '+ROUND_NAMES[r]+'</span><span>'+(open?'🔓':'🔒')+'</span></h3><div class="in">'+inner+'</div></div>';
  }}
  render('<div class="topbar"><div class="t">Moist Wombat</div><button class="btn sm dark" data-a="veil">'+(veiled?'👁 Show':'🙈 Hide')+'</button></div>'+
   cardHtml(c)+rounds+
   '<div style="margin-top:18px"><button class="btn red block" data-a="accuse" style="min-height:64px;font-size:22px">☠ Make my accusation</button></div>'+
   '<p class="center small muted" style="margin-top:16px">Keep this tab open (or keep the link) — this card is only for you.</p>');
  if(veiled)document.querySelectorAll('.hideable').forEach(function(e){e.classList.add('veiled')});
}
function accuseView(p){
  var c=CH[p.id],key='mm_acc_'+p.seed+'_'+p.id,a=lsGet(key,{});
  var opts=p.cast.filter(function(i){return i!==p.id&&!CH[i].extra}).map(function(i){return '<option value="'+i+'"'+(+a.who===i?' selected':'')+'>'+esc(CH[i].name)+'</option>'}).join('');
  if(view.showAcc){
    var w=CH[a.who];
    render('<div class="show"><div class="tag">'+esc(c.name)+' says…</div><div class="big">J\'accuse, ya grub!</div>'+
    '<div class="q">Who killed Beau</div><div class="cname" style="font-size:clamp(36px,11vw,64px)">'+(w?esc(w.name):'???')+'</div>'+
    '<div class="q">How did they get into the cool room</div><div class="a">'+esc(a.how||'—')+'</div>'+
    '<div class="q">Why did they do it</div><div class="a">'+esc(a.why||'—')+'</div>'+
    '<div class="q">The lie that gave them away</div><div class="a">'+esc(a.lie||'—')+'</div>'+
    '<div style="margin-top:28px"><button class="btn dark block" data-a="hideacc">Done</button></div></div>');return;
  }
  render('<div class="topbar"><div class="t">Accusation</div><button class="btn sm dark" data-a="back">← My card</button></div>'+
  '<div class="panel stack"><h2 class="cname" style="font-size:42px;color:var(--red)">J\'accuse, ya grub!</h2>'+
  '<div><span class="lbl">Who killed Beau</span><select id="aw"><option value="">Pick a suspect…</option>'+opts+'</select></div>'+
  '<div><span class="lbl">How did they get into the cool room</span><textarea id="ah">'+esc(a.how)+'</textarea></div>'+
  '<div><span class="lbl">Why did they do it</span><textarea id="ay">'+esc(a.why)+'</textarea></div>'+
  '<div><span class="lbl">The lie that gave them away</span><textarea id="al">'+esc(a.lie)+'</textarea></div>'+
  '<div class="err" id="aerr"></div>'+
  '<button class="btn red block" data-a="showacc" style="min-height:64px;font-size:21px">☠ Lock it in &amp; show the host</button>'+
  '<button class="btn dark block" data-a="saveacc">Save for later</button></div>');
}
function readAcc(p){var key='mm_acc_'+p.seed+'_'+p.id,a={who:+$('#aw').value||'',how:$('#ah').value,why:$('#ay').value,lie:$('#al').value};lsSet(key,a);return a}

/* ---------- board ---------- */
function board(t){
  var s=untok(t),parts=s?s.split('.'):[];
  if(parts.length!==2||!/^[a-z0-9]{4,10}$/.test(parts[0])){render('<h1 class="title">Dodgy link</h1><div class="panel center"><a class="btn" href="#">Home</a></div>');return}
  var seed=parts[0],u=unlocked(seed),cols='';
  for(var r=1;r<=3;r++){
    if(u>=r)cols+='<div class="bcol"><h2>Round '+r+'</h2><div class="center tag">'+ROUND_NAMES[r]+'</div>'+D.clues.filter(function(x){return x.r===r}).map(function(x){return clueHtml(x,false)}).join('')+'</div>';
    else cols+='<div class="bcol locked"><h2>Round '+r+'</h2><div class="lockbig">🔒</div>'+(r===u+1?'<div class="codein"><input id="code'+r+'" placeholder="ROUND '+r+' CODE" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="btn" data-a="bcode" data-id="'+r+'" data-seed="'+seed+'">Unlock</button></div><div class="err" id="cerr'+r+'"></div>':'')+'</div>';
  }
  render('<div class="board"><h1 class="title">The Evidence Board</h1><div class="tag">Last Drinks at the Moist Wombat · Beau died at 10:48pm · nobody leaves</div><div class="drip"></div><div class="bcols">'+cols+'</div>'+
  '<p class="center" style="margin-top:30px"><a class="btn ghost sm" href="#">Home</a></p></div>',true);
  try{if(navigator.wakeLock&&!board._wl)navigator.wakeLock.request('screen').then(function(l){board._wl=l;l.addEventListener('release',function(){board._wl=null})}).catch(function(){})}catch(e){}
}
function tryCode(seed,r,errId){
  var inp=$('#code'+r),v=norm(inp&&inp.value),C=codes(seed),hit=0;
  for(var i=1;i<=3;i++)if(v&&v===C[i])hit=i;
  if(!hit){var e=$('#'+errId+r);if(e)e.textContent='Nope. That\'s not the code, ya galah.';if(inp){inp.value='';}return}
  if(hit>unlocked(seed))setUnlocked(seed,hit);
  toast('🔓 Round '+hit+' unlocked!');route();
}

/* ---------- actions (event delegation; works with taps in iOS standalone) ---------- */
document.addEventListener('click',function(ev){
  var el=ev.target.closest('[data-a]');if(!el)return;
  var a=el.getAttribute('data-a'),id=el.getAttribute('data-id');
  if(el.tagName==='BUTTON')ev.preventDefault();
  var p;
  switch(a){
  case 'close':closeModal();break;
  case 'askyes':closeModal();if(ask.fn)ask.fn();break;
  case 'gohost':go('host');break;
  case 'setpin':{var a1=$('#pin1').value.trim(),a2=$('#pin2').value.trim();
    if(!/^\d{4,12}$/.test(a1)){$('#perr').textContent='Use 4–12 digits.';break}
    if(a1!==a2){$('#perr').textContent='PINs don\'t match.';break}
    H=H||{};H.pin=hashPin(a1);H.seed=H.seed||newSeed();H.cast=H.cast||CORE.slice();saveH();ssSet('mm_hostok',H.pin);view.tab='links';route();break}
  case 'unlock':{var v=$('#pin').value.trim();if(hashPin(v)===H.pin){ssSet('mm_hostok',H.pin);route()}else{$('#perr').textContent='Wrong PIN.';$('#pin').value=''}break}
  case 'forgot':ask('Reset the host PIN? Your cast, links and codes stay the same — you\'ll just set a new PIN.','Reset PIN',function(){H.pin=null;saveH();route()});break;
  case 'lock':ssSet('mm_hostok','');go('');break;
  case 'tab':view.tab=id;hostDash();window.scrollTo(0,0);break;
  case 'reveal':view['rev'+id]=1;hostDash();break;
  case 'cast':{var n=+id;if(CH[n].core){toast('Core roles 1–16 are always in play');break}
    var i=H.cast.indexOf(n);if(i>=0)H.cast.splice(i,1);else H.cast.push(n);H.cast.sort(function(x,y){return x-y});saveH();var y=window.scrollY;hostDash();window.scrollTo(0,y);break}
  case 'qr':{var c=CH[+id],url=playerUrl(+id);modal('<div class="box"><div class="cname" style="font-size:36px">'+esc(c.name)+'</div><p class="small muted">Scan with the phone camera. For '+esc(c.name)+'\'s eyes only.</p><div class="qr">'+qrSvg(url)+'</div><div class="linkbox">'+esc(url)+'</div><div class="row"><button class="btn green" data-a="share" data-id="'+c.id+'">📤 Share</button><button class="btn dark" data-a="copy" data-id="'+c.id+'">📋 Copy</button></div><button class="btn ghost block" data-a="close" style="margin-top:10px">Close</button></div>');break}
  case 'share':{var c2=CH[+id];share('Last Drinks at the Moist Wombat','🩸 '+c2.name+' — your secret character for Last Drinks at the Moist Wombat. Don\'t show anyone!',playerUrl(+id));break}
  case 'copy':copy(playerUrl(+id));break;
  case 'copyall':copy(H.cast.map(function(i){return CH[i].name+': '+playerUrl(i)}).join('\n'));break;
  case 'peek':modal('<div class="box" style="text-align:left;max-width:700px;padding:10px"><button class="btn dark block sm" data-a="close" style="margin-bottom:10px">✕ Close</button>'+cardHtml(CH[+id])+'<button class="btn block" data-a="close" style="margin-top:12px">Close</button></div>');break;
  case 'hunlock':setUnlocked(H.seed,Math.max(unlocked(H.seed),+id));toast('Round '+id+' unlocked on this device');hostDash();break;
  case 'relock':ask('Re-lock all rounds on this device\'s Evidence Board?','Re-lock',function(){setUnlocked(H.seed,0);hostDash()});break;
  case 'bqr':modal('<div class="box"><div class="cname" style="font-size:36px">Evidence Board</div><div class="qr">'+qrSvg(boardUrl())+'</div><div class="linkbox">'+esc(boardUrl())+'</div><button class="btn ghost block" data-a="close">Close</button></div>');break;
  case 'bcopy':copy(boardUrl());break;
  case 'chpin':ask('Set a new PIN?','Yes',function(){H.pin=null;saveH();ssSet('mm_hostok','');route()});break;
  case 'newgame':ask('Start a new game? Every link you\'ve sent and all round codes will stop working.','New game',function(){H.seed=newSeed();saveH();toast('New game created');hostDash()});break;
  case 'pcode':p=parseP(location.hash.slice(3));if(p)tryCode(p.seed,+id,'cerr');break;
  case 'bcode':tryCode(el.getAttribute('data-seed'),+id,'cerr');break;
  case 'veil':view.veil=!view.veil;route();break;
  case 'accuse':view.accuse=1;view.showAcc=0;route();window.scrollTo(0,0);break;
  case 'back':view.accuse=0;route();window.scrollTo(0,0);break;
  case 'saveacc':p=parseP(location.hash.slice(3));if(p){readAcc(p);toast('Saved')}break;
  case 'showacc':p=parseP(location.hash.slice(3));if(p){var ac=readAcc(p);if(!ac.who){$('#aerr').textContent='Pick who did it first!';break}view.showAcc=1;route();window.scrollTo(0,0)}break;
  case 'hideacc':view.showAcc=0;route();break;
  }
});
document.addEventListener('keydown',function(e){
  if(e.key!=='Enter')return;var t=e.target;if(!t||t.tagName!=='INPUT')return;
  var b=t.parentNode.querySelector('[data-a]')||(t.id==='pin'?$('[data-a=unlock]'):t.id==='pin2'?$('[data-a=setpin]'):null);
  if(b){e.preventDefault();b.click()}
});
$('#modal').addEventListener('click',function(e){if(e.target.id==='modal')closeModal()});

if('serviceWorker' in navigator&&location.protocol==='https:'){navigator.serviceWorker.register('sw.js').catch(function(){})}
route();
})();
