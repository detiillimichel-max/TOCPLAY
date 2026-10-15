const state={category:"all",query:"",page:1,loading:false,hasMore:false};
const $=s=>document.querySelector(s);
const results=$("#results"),statusBox=$("#status"),countBox=$("#result-count"),moreButton=$("#load-more"),facebookNote=$("#facebook-note");
const categoryLabels={all:"Tudo",movies:"Filmes",cartoons:"Desenhos",documentaries:"Documentários",science:"Ciência",facebook:"Facebook"};
const facebookVideos=[
 {title:"NASA — Expo de tecnologia aeroespacial",source:"NASA",description:"America’s newest and most exciting aerospace technology expo and air show.",url:"https://www.facebook.com/share/v/1NbVkXHPoD/"},
 {title:"NASA Mars — Novo recorde em Marte",source:"NASA Mars",description:"It's a new off-world record! Vídeo oficial da NASA Mars.",url:"https://www.facebook.com/share/v/1L7JockwLQ/"},
 {title:"National Geographic — Grande Barreira de Corais",source:"National Geographic",description:"Journey beneath the waves and meet the life of the Great Barrier Reef.",url:"https://www.facebook.com/share/r/1DjyFHq8pW/"},
 {title:"National Geographic — Curiosidades do espaço",source:"National Geographic",description:"A year of space facts: discoveries about planets beyond our Solar System.",url:"https://www.facebook.com/share/r/1JpRwwg948/"},
 {title:"BBC News — A ameaça atual da inteligência artificial",source:"BBC News",description:"Artificial intelligence is becoming an important topic to monitor.",url:"https://www.facebook.com/share/r/1VwkkW6Jd8/"}
];
function escapeHtml(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function setStatus(message){statusBox.textContent=message;statusBox.hidden=false;}
function categoryFor(item){const text=(item.title+" "+(item.description||"")).toLowerCase();if(/cartoon|animation|animated|animat|desenho|anime/.test(text))return"cartoons";if(/documentary|documentário|history|nature|natureza|história/.test(text))return"documentaries";if(/science|space|astronomy|robot|ciência|espaço|robótica/.test(text))return"science";return"movies";}
function card(item){const title=escapeHtml(item.title||"Vídeo sem título");const description=escapeHtml((item.description||"Conteúdo público disponível na fonte original.").replace(/<[^>]*>/g,""));const source=escapeHtml(item.source||"Internet Archive");const year=escapeHtml(item.year||"");const href=escapeHtml(item.url||"#");const thumb=item.thumbnail?'<img loading="lazy" src="'+escapeHtml(item.thumbnail)+'" alt="">':"";return '<article class="video-card"><div class="thumb">'+thumb+'<span class="play-badge" aria-hidden="true">▶</span></div><div class="card-body"><h3>'+title+'</h3><p class="card-description">'+description+'</p><div class="card-meta">'+source+(year?" · "+year:"")+'</div><a class="card-link" href="'+href+'" target="_blank" rel="noopener noreferrer">Assistir na fonte ↗</a></div></article>';}
function ensureFacebookPlayer(){
 if($("#facebook-player-modal"))return;
 const style=document.createElement("style");
 style.textContent=".fb-modal{position:fixed;inset:0;z-index:30;background:#05070bf2;display:none;align-items:center;justify-content:center;padding:14px}.fb-modal.open{display:flex}.fb-modal-panel{width:min(560px,100%);max-height:95dvh;overflow:auto;background:#101621;border:1px solid #344052;border-radius:18px;padding:12px}.fb-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;color:#f4f7fb;font-weight:800}.fb-modal-close{border:1px solid #344052;border-radius:10px;background:#1a2635;color:#fff;padding:9px 13px;font:inherit}.fb-modal-frame{display:block;width:100%;height:min(72dvh,760px);min-height:420px;border:0;border-radius:10px;background:#000}.fb-modal-fallback{display:block;margin-top:10px;text-align:center;padding:11px;border-radius:10px;background:#1a2635;color:#f4f7fb;text-decoration:none}@media(max-width:420px){.fb-modal{padding:6px}.fb-modal-panel{padding:8px}.fb-modal-frame{height:68dvh;min-height:360px}}";
 document.head.appendChild(style);
 const modal=document.createElement("div");modal.id="facebook-player-modal";modal.className="fb-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Player do Facebook");
 modal.innerHTML='<div class="fb-modal-panel"><div class="fb-modal-head"><span id="fb-modal-title">Vídeo do Facebook</span><button class="fb-modal-close" type="button">Fechar ✕</button></div><iframe class="fb-modal-frame" title="Vídeo incorporado do Facebook" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe><a class="fb-modal-fallback" target="_blank" rel="noopener noreferrer">Se não reproduzir, abrir no Facebook ↗</a></div>';
 document.body.appendChild(modal);
 modal.querySelector(".fb-modal-close").addEventListener("click",closeFacebookPlayer);
 modal.addEventListener("click",e=>{if(e.target===modal)closeFacebookPlayer();});
 document.addEventListener("keydown",e=>{if(e.key==="Escape")closeFacebookPlayer();});
}
function closeFacebookPlayer(){const modal=$("#facebook-player-modal");if(!modal)return;modal.classList.remove("open");modal.querySelector("iframe").src="about:blank";}
async function openFacebookPlayer(item){
 ensureFacebookPlayer();
 const modal=$("#facebook-player-modal");
 const frame=modal.querySelector("iframe");
 const title=$("#fb-modal-title");
 const fallback=modal.querySelector(".fb-modal-fallback");
 title.textContent=item.title+" · carregando…";
 frame.src="about:blank";
 fallback.href=item.url;
 modal.classList.add("open");
 let playerUrl=item.url;
 try{
  const response=await fetch("/api/meta-oembed?url="+encodeURIComponent(item.url),{headers:{Accept:"application/json"}});
  const data=await response.json().catch(()=>null);
  if(data&&data.resolved_share_url&&/^https:\/\/([a-z0-9-]+\.)*facebook\.com\//i.test(data.resolved_share_url)){
   playerUrl=data.resolved_share_url;
  }else if(data&&data.ok&&data.embed_url){
   playerUrl=data.embed_url;
  }
 }catch(error){
  // The official Facebook iframe remains the fallback if the resolver is unavailable.
 }
 if(!modal.classList.contains("open"))return;
 title.textContent=item.title;
 fallback.href=playerUrl;
 frame.src="https://www.facebook.com/plugins/video.php?href="+encodeURIComponent(playerUrl)+"&show_text=false&width=500";
}
function showFacebookCatalog(){
 facebookNote.hidden=true;moreButton.hidden=true;countBox.textContent=facebookVideos.length+" vídeos selecionados";
 results.innerHTML=facebookVideos.map((item,index)=>'<article class="video-card"><button class="thumb fb-play-card" type="button" data-fb-index="'+index+'" aria-label="Reproduzir '+escapeHtml(item.title)+'"><span class="play-badge" aria-hidden="true">▶</span></button><div class="card-body"><h3>'+escapeHtml(item.title)+'</h3><p class="card-description">'+escapeHtml(item.description)+'</p><div class="card-meta">'+escapeHtml(item.source)+' · Facebook</div><button class="card-link fb-play-button" type="button" data-fb-index="'+index+'">Reproduzir no PLAYORA ▶</button><a class="card-link" href="'+escapeHtml(item.url)+'" target="_blank" rel="noopener noreferrer">Abrir no Facebook ↗</a></div></article>').join("");
 statusBox.hidden=true;
 results.querySelectorAll("[data-fb-index]").forEach(button=>button.addEventListener("click",()=>openFacebookPlayer(facebookVideos[Number(button.dataset.fbIndex)])));
}
function showFacebookNotice(){facebookNote.hidden=state.category!=="facebook";if(state.category==="facebook"){showFacebookCatalog();}}
async function search(reset=true){if(state.loading)return;if(state.category==="facebook"){showFacebookNotice();return;}if(reset){state.page=1;results.innerHTML="";state.hasMore=false;}state.loading=true;moreButton.hidden=true;facebookNote.hidden=true;setStatus("Buscando conteúdos públicos…");try{const params=new URLSearchParams({q:state.query,category:state.category,page:String(state.page)});const response=await fetch("/api/search?"+params.toString(),{headers:{Accept:"application/json"}});if(!response.ok)throw new Error("A busca respondeu com erro "+response.status);const data=await response.json();if(reset)results.innerHTML="";if(data.items&&data.items.length){results.insertAdjacentHTML("beforeend",data.items.map(card).join(""));statusBox.hidden=true;countBox.textContent=(data.total||data.items.length)+" resultado(s)";}else if(reset){setStatus("Não encontramos resultados nesta pesquisa. Tente outro termo ou categoria.");countBox.textContent="0 resultados";}state.hasMore=Boolean(data.hasMore);moreButton.hidden=!state.hasMore;}catch(error){setStatus("Não foi possível consultar a fonte agora. Confira a conexão e tente novamente. Detalhe: "+error.message);countBox.textContent="Busca indisponível";}finally{state.loading=false;}}
$("#search-form").addEventListener("submit",event=>{event.preventDefault();state.query=$("#search-input").value.trim();search(true);});
$("#category-list").addEventListener("click",event=>{const button=event.target.closest("[data-category]");if(!button)return;state.category=button.dataset.category;document.querySelectorAll(".category-chip").forEach(chip=>chip.classList.toggle("active",chip===button));$("#results-heading").textContent=state.category==="all"?"Para descobrir":categoryLabels[state.category];search(true);});
moreButton.addEventListener("click",()=>{state.page+=1;search(false);});
if("serviceWorker" in navigator&&location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));}
search(true);