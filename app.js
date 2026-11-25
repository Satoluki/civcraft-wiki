'use strict';
(() => {
  const db = window.CIV_DATA;
  const pages = db.pages;
  const byId = new Map(pages.map(p => [p.id, p]));
  const main = document.querySelector('#content');
  const searchInput = document.querySelector('#search');
  const categories = ['Общая информация','Военные сооружения','Постройки','Улучшения','Чудеса','Юниты','Команды','Технологии','Мир и приключения','Справка'];
  const aliases = {'Александрийская библиотека':'the_great_library','Древо Жизни':'mother_tree','Нотр-Дам-де-Пари':'notre_dame','Пирамида Хеопса':'the_great_pyramid','Колосс Родосский':'the_colossus','Глобус (Театр)':'globe_theatre','Урожайность':'growth','Государственный строй':'governments','Башня пушкарей':'cannon_tower','Корабль пушкарей':'cannon_ship','Дирижабль':'balloon','Рыболовное судно':'fishing_boat','Ангкор-Ват':null};
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const canonical = s => String(s).toLowerCase().replace(/ё/g,'е');
  const url = id => '#/' + encodeURIComponent(id);
  const a = (id, label) => `<a href="${url(id)}">${esc(label || byId.get(id)?.title || id)}</a>`;
  const external = (href,label) => /^https?:\/\//.test(href) ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : esc(label);
  const names = new Map(pages.map(p=>[canonical(p.title),p.id]));
  Object.entries(aliases).forEach(([name,id])=> {if(id) names.set(canonical(name),id);});
  const terms = [...new Set([...pages.map(p=>p.title),...Object.keys(aliases).filter(n=>aliases[n])])].sort((a,b)=>b.length-a.length);
  const termRE = new RegExp('(?<![\\p{L}\\p{N}])(' + terms.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|') + ')(?![\\p{L}\\p{N}])','giu');
  function linkify(text,exclude) {
    let out='',last=0;
    for(const match of String(text).matchAll(termRE)) {
      out+=esc(String(text).slice(last,match.index));
      const id=names.get(canonical(match[0]));
      out+=id && id!==exclude?a(id,match[0]):esc(match[0]);
      last=match.index+match[0].length;
    }
    return out+esc(String(text).slice(last));
  }
  function load(key,fallback) {try {return JSON.parse(localStorage.getItem('civcraft-'+key)) ?? fallback;} catch {return fallback;}}
  function save(key,value) {try {localStorage.setItem('civcraft-'+key,JSON.stringify(value));return true;}catch {return false;}}
  let favorites = load('favorites',[]).filter(id=>byId.has(id));
  let currentId='home';
  function h1(title,crumb='') {return `${crumb?`<div class="breadcrumb">${a('home','Заглавная страница')} › ${crumb}</div>`:''}<h1>${esc(title)}</h1>`;}
  function tableHTML(t,exclude,caption='') {
    if(!t?.rows?.length) return '';
    const rows=t.rows;
    return `<div class="table-scroll ${rows[0].length>7?'wide':''}"><table class="wikitable">${caption?`<caption>${esc(caption)}</caption>`:''}<thead><tr>${rows[0].map(c=>`<th scope="col">${linkify(c,exclude)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r=>`<tr>${r.map(c=>`<td>${linkify(c,exclude)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function navMatrix() {
    const groups=[['Общая информация',p=>['Общая информация','Технологии','Мир и приключения','Справка'].includes(p.category)],['Военные сооружения',p=>p.category==='Военные сооружения'],['Постройки',p=>p.category==='Постройки'],['Улучшения',p=>p.category==='Улучшения'],['Чудеса',p=>p.category==='Чудеса'],['Юниты',p=>p.category==='Юниты'],['Команды',p=>p.category==='Команды']];
    return `<div class="matrix-scroll"><nav class="nav-matrix" aria-label="Другая информация">${groups.map(([name,filter])=>`<div class="nav-col"><h3>${esc(name)}</h3>${pages.filter(filter).map(p=>a(p.id,p.title)).join('')}${name==='Юниты'?a('units','Поселенец и шпион'):''}</div>`).join('')}</nav></div>`;
  }
  function titleMeta(p) {
    return `<div class="article-meta"><span>Cristalix · ${esc(p.category)}${p.era?' · '+esc(p.era):''}</span><button data-favorite="${esc(p.id)}" aria-pressed="${favorites.includes(p.id)}">${favorites.includes(p.id)?'★ В избранном':'☆ В избранное'}</button></div>`;
  }
  function statsHTML(p) {
    const icons = {'Размер':'size','здание':'building','технолог':'tech','Стоимость':'money','Налог':'taxes','Молоточки':'hammers','молоточ':'hammers','Прочность':'durability','Восстановление':'mace_(1)','Очки':'points','Ограничение':'limits'};
    const priority = ['Размер','Необходимое здание','Необходимая технология','Стоимость','Налог','молоточ','Молоточки','Прочность','Восстановление','Очки','Ограничение'];
    const rank = label => {let i=priority.findIndex(k=>label.includes(k));return i<0?99:i;};
    const rows=[...p.stats].sort((x,y)=>rank(x[0])-rank(y[0]));
    return `<div class="stat-wrap"><table class="stats" aria-label="Характеристики ${esc(p.title)}"><tbody>${rows.map(([k,v])=> {const icon=Object.entries(icons).find(([label])=>k.includes(label))?.[1]||'•';return `<tr><td><span class="stat-icon" aria-hidden="true">${iconHTML(icon,'•')}</span>${esc(k.replace(/:$/,''))}</td><td>${linkify(v,p.id)}</td></tr>`;}).join('')}</tbody></table></div>`;
  }
  const iconHTML = (name, fallback='') => db.icons?.[name] ? `<img class="game-icon" src="${db.icons[name]}" alt="" aria-hidden="true">` : `<span aria-hidden="true">${fallback}</span>`;
  function homepage() {
    document.title='CivCraft Cristalix — личная вики';
    const sections=[
      ['building','▤','Город и строительство','Здания, требования, цены и улучшения.',[['buildings','Все здания по эпохам'],['category/Улучшения','Производство и улучшения'],['category/Чудеса','Чудеса света']]],
      ['money','◉','Экономика и ресурсы','Доход, расходы и выработка города.',[['cottage','Доход коттеджей'],['hammers','Молоточки и стройка'],['happinness','Счастье и эффективность']]],
      ['tech','⚗','Развитие цивилизации','Первые шаги, исследования и культура.',[['quick-start','Быстрый старт на Cristalix'],['techtree','Дерево технологий'],['science','Наука'],['culture','Культура']]],
      ['durability','♜','Мир и война','Место для города, защита и сражения.',[['biome','Биомы и выбор места'],['diplomacy','Дипломатия и война'],['category/Военные сооружения','Военные сооружения'],['units','Юниты и шпионаж']]]
    ];
    main.innerHTML=h1('CivCraft Cristalix')+`<div class="article-meta"><span>Личная вики по текущему проекту</span><span>Данные проверены 25.11.2026</span></div>
      <div class="welcome"><h2>Всё для игры на Cristalix</h2><p>Найди нужное здание, разберись с механикой и спланируй развитие города.</p></div>
      <p>Основные характеристики и команды здесь — из <strong>официальной вики Cristalix</strong>. Объяснения написаны простым языком, а знакомая структура помогает быстро переходить между статьями.</p>
      <div class="quick-links">${a('quick-start','Начать играть')} ${a('buildings','Найти здание')} ${a('techtree','Выбрать технологию')} ${a('category/Команды','Найти команду')} ${a('all','Все статьи')}</div>
      <p class="count-note">Зданий: ${db.meta.buildings} · Чудес: ${db.meta.wonders} · Технологий: ${db.meta.technologies} · Статей: ${pages.length}</p>
      <h2>Разделы Cristalix</h2><div class="topic-grid">${sections.map(([icon,fallback,title,desc,links])=>`<section class="topic-card"><h3>${iconHTML(icon,fallback)}${title}</h3><p>${desc}</p><ul>${links.map(([id,label])=>`<li>${a(id,label)}</li>`).join('')}</ul></section>`).join('')}</div>
      <div class="home-columns"><section class="home-box"><h2>Что проверить в городе</h2><div><ol><li>${a('cottage','Доход и содержание построек')}</li><li>${a('happinness','Счастье и производительность')}</li><li>${a('hammers','Скорость строительства')}</li><li>${a('science','Скорость исследований')}</li><li>${a('time-and-timers','Ближайшие события и таймеры')}</li></ol></div></section><section class="home-box"><h2>Полезные команды Cristalix</h2><div><p><code>/quest</code> — задания и развитие<br><code>/crafts</code> — рецепты<br><code>/civ time</code> — мировые таймеры<br><code>/tn info</code> — состояние города</p><p>${a('category/Команды','Открыть справочник команд')}</p></div></section></div>
      <h2>Все разделы и статьи</h2><p>Открой статью из таблицы. В ${a('buildings','каталоге зданий')} можно выбрать эпоху, отфильтровать названия и сравнить стоимость.</p>${navMatrix()}
      <details class="archive-reference"><summary>Знакомые названия из VimeWorld</summary><p>Поиск понимает «Древо Жизни», «Александрийская библиотека», «Дирижабль» и другие старые названия. Исторические сравнения находятся внизу статей. Для игры используй характеристики Cristalix.</p></details>
      <div class="notice">Снимок официальной вики на <strong>25.11.2026</strong>. Расхождения с обновлением сезона подписаны в статьях. ${a('about','Источники, резервные копии и сведения о вики')}.</div>`;
  }
  function calculator(p) {
    if(!['hammers','science','cottage','happinness'].includes(p.id))return '';
    const conf={hammers:['Оценить время стройки','Осталось молоточков','Молоточков в час',550000,1000],science:['Оценить время исследования','Осталось науки','Науки в час',10000,500],cottage:['Оценить доход коттеджа','Базовый доход в час','Рейтинг коттеджей, %',700,145],happinness:['Рассчитать счастье','Очки счастья','Очки несчастья',12,5]}[p.id];
    return `<h2 id="calculator">${conf[0]}</h2><form class="calculator" data-calc="${p.id}"><div class="fields"><label>${conf[1]}<input name="first" type="number" min="0" step="any" value="${conf[3]}"></label><label>${conf[2]}<input name="second" type="number" min="0" step="any" value="${conf[4]}"></label></div><output aria-live="polite"></output><p class="table-note">Расчёт по введённым значениям. Он не подключён к серверу. Для времени используй итоговую текущую выработку и оставшийся объём.</p></form>`;
  }
  function archived(p) {
    if(!p.old)return '';
    return `<details id="old" class="archive-reference"><summary>Историческая справка: VimeWorld</summary><div class="notice warning">Архивная справка с открытой страницы VimeWorld. Это не гарантированный снимок именно 2022 года. Для нынешней игры используй характеристики Cristalix выше.</div>${p.old.stats.length?tableHTML({rows:[['Параметр VimeWorld','Архивное значение'],...p.old.stats]},p.id):'<p>В прочитанной старой статье есть описание механики, но отдельная карточка численных характеристик не найдена.</p>'}<p>${external(p.old.url,'Открыть старую статью: '+p.old.title)}</p></details>`;
  }
  function renderTech(p) {
    return `<h2 id="techs">Технологии по эпохам</h2><div class="filters"><label>Найти технологию <input id="tech-search" type="search" placeholder="Название или требование"></label><span class="small">Базовые значения Cristalix</span></div><div id="tech-table">${techTable(p.techs)}</div>`;
  }
  function techTable(techs) {
    return techs.length?'<p class="table-note">Основные числа — из страницы древа. Если обновление сезона указывает другую цену, она подписана отдельно. Без проверки игрового меню выбрать точное текущее значение нельзя.</p>'+tableHTML({rows:[['Технология','Эпоха','Монеты','Наука','Требования'],...techs.map(t=>[t.name,t.era,t.coins+(t.patchCoins?' (обновление: '+t.patchCoins+')':''),t.science+(t.patchScience?' (обновление: '+t.patchScience+')':''),t.requires])]},'techtree'):'<p>Технологии не найдены.</p>';
  }
  function article(p) {
    currentId=p.id;
    document.title=p.title+' — CivCraft Вики | Cristalix';
    const sections=[['simple','Описание и применение']];
    if(p.tables.length) sections.push(['tables','Таблицы и значения']);
    if(p.variants.length) sections.push(['levels','Уровни и варианты']);
    if(p.techs) sections.push(['techs','Дерево технологий']);
    if(p.commands.length)sections.push(['commands','Команды']);
    if(p.old) sections.push(['old','Архивная справка VimeWorld']);
    sections.push(['sources','Источники'],['notes','Мои заметки']);
    const favorite=titleMeta(p);
    const related=[...new Set(p.relatedSources.map(l=>pages.find(x=>normalizeURL(x.source)===normalizeURL(l.url))?.id).filter(id=>id&&id!==p.id))];
    const conflicts=p.discrepancies?.length?`<div class="notice warning"><strong>В официальных источниках есть расхождения.</strong> Карточка статьи и обновление сезона дают разные значения. Ниже сохранены оба варианта; точное текущее поведение нужно сверить в игровом меню.</div>${tableHTML({rows:[['Параметр','Карточка Cristalix','Обновление сезона 2, акт 1'],...p.discrepancies]},p.id)}<p class="small">${external(p.source,'Карточка статьи')} · ${external(p.patchSource,'Обновление сезона')}</p>`:'';
    main.innerHTML=h1(p.title,a('category/'+p.category,p.category)) +favorite+`<p class="intro">${linkify(p.summary,p.id)}</p>`+conflicts+(p.stats.length?`<h2>Характеристики из карточки Cristalix</h2>`+statsHTML(p):'')+
      `<nav class="toc" aria-label="Содержание статьи"><strong>Содержание</strong><ul>${sections.map(([id,title])=>`<li><a href="#${id}" data-anchor="${id}">${title}</a></li>`).join('')}</ul></nav>
      <h2 id="simple">Описание и применение</h2>${p.discrepancies?.length?'<p class="table-note">Далее — объяснение карточки статьи. Для спорных параметров учитывай сравнение с обновлением выше.</p>':''}${p.paragraphs.map(t=>`<p>${linkify(t,p.id)}</p>`).join('')}`+
      (p.isWonder&&p.id!=='colosseum'?`<div class="notice">Мировое чудо уникально: его получает цивилизация, завершившая стройку первой. Остальным по карточкам чудес возвращается 50% монет. ${a('s2-a1','В обновлении')} отдельно описан бонус следующей стройке из половины потраченных молоточков, с ограничениями по городу и эпохе.</div>`:'')+
      (p.tables.length?`<h2 id="tables">Таблицы и значения</h2><p class="table-note">Числа и названия из указанной официальной статьи. Единицы измерения даны в заголовках; неподписанные эффекты не считаются автоматически часовыми.</p>${p.tables.map(t=>tableHTML(t,p.id)).join('')}`:'')+
      (p.variants.length?`<h2 id="levels">Уровни и варианты</h2><p>Открой нужный уровень или вариант. Если групп несколько, они соответствуют разным улучшениям или категориям источника.</p>${p.variants.map((v,i)=>`<details class="variant" ${i===0?'open':''}><summary>${p.variants.some(x=>x.group>1)?'Группа '+v.group+' · ':''}${esc(v.name)}</summary><div>${v.tables.map(t=>tableHTML(t,p.id)).join('')}</div></details>`).join('')}`:'')+
      (p.techs?renderTech(p):'')+
      (p.commands.length?`<h2 id="commands">Команды</h2><div class="table-scroll"><table class="wikitable"><thead><tr><th>Команда</th><th>Назначение</th></tr></thead><tbody>${p.commands.map(([cmd,desc])=>`<tr><td><div class="command-row"><code>${esc(cmd)}</code><button class="copy" data-copy="${esc(cmd)}" aria-label="Скопировать команду ${esc(cmd)}">Копировать</button></div></td><td>${esc(desc)}</td></tr>`).join('')}</tbody></table></div><p class="status" id="copy-status" role="status"></p>`:'')+
      calculator(p)+
      `<h2 id="sources">Источники</h2><p>${external(p.source,'Официальная статья Cristalix')}${p.sources?.map((s,i)=>' · '+external(s,'Дополнительный источник '+(i+1))).join('')||''}</p><p class="small">Прочитано 25 ноября 2026. Характеристики взяты из вики, объяснение написано для этого справочника. Игровая проверка значений не выполнялась.</p>`+
      (related.length?`<h3>Смотри также</h3><div class="quick-links">${related.map(id=>a(id)).join('')}</div>`:'')+
      archived(p)+`<h2 id="notes">Мои заметки</h2><div class="notes"><label for="personal-note">Заметка к статье «${esc(p.title)}»</label><textarea id="personal-note" data-note="${esc(p.id)}" placeholder="Например: какие ресурсы готовим и кто отвечает за снабжение…">${esc(load('note-'+p.id,''))}</textarea><p id="note-status">Хранятся только в этом браузере. Можно сохранить резервную копию в разделе «О личной вики».</p></div><h2>Другая информация</h2>${navMatrix()}`;
    updateCalculators();
  }
  function normalizeURL(href) {try{return new URL(href).pathname.replace(/^\/ru\//,'/').replace(/\/$/,'').toLowerCase();}catch{return href;}}
  function searchScore(p,q) {
    const n=canonical(q.trim()); if(!n)return 0;
    const t=canonical(p.title), alias=Object.entries(aliases).find(([name,id])=>canonical(name).includes(n)&&id===p.id);
    if(t===n||alias&&canonical(alias[0])===n)return 100;
    if(t.startsWith(n))return 80;
    if(t.includes(n)||alias)return 60;
    const full=canonical([p.title,p.summary,...p.paragraphs,p.category,p.era,JSON.stringify(p.stats),JSON.stringify(p.commands),JSON.stringify(p.techs||[])].join(' '));
    const words=n.split(/\s+/).filter(Boolean);
    return words.every(w=>full.includes(w))?20:0;
  }
  function listHTML(list) {
    return list.length?`<ul class="article-list">${list.map(p=>`<li><h3>${a(p.id,p.title)}</h3><span class="small">${esc(p.category)}${p.era?' · '+esc(p.era):''}</span><p>${esc(p.summary)}</p></li>`).join('')}</ul>`:'<p class="search-empty">Ничего не найдено. Попробуй другое название или сними фильтр.</p>';
  }
  let catalogList=[];
  function listing(list,title,query='') {
    catalogList=list;
    document.title=title+' — CivCraft Вики';
    const eras=[...new Set(list.map(p=>p.era).filter(Boolean))];
    main.innerHTML=h1(title)+`<p>${query?'По запросу <strong>«'+esc(query)+'»</strong> найдено '+list.length+' статей.':'Выбери статью или уточни список.'}</p>${canonical(query).includes('ангкор')?'<div class="notice">Ангкор-Ват есть в старой вики VimeWorld. В прочитанном каталоге чудес Cristalix он не указан, поэтому его старые бонусы здесь не выдаются за действующие.</div>':''}<div class="filters"><label>Фильтр <input id="list-filter" type="search" placeholder="Название или назначение"></label>${eras.length?`<label>Эпоха <select id="era-filter"><option value="">Все эпохи</option>${eras.map(e=>`<option>${esc(e)}</option>`).join('')}</select></label>`:''}<label>Порядок <select id="sort-filter"><option value="default">Как в списке</option><option value="title">По названию</option><option value="price">По стоимости</option></select></label></div><p class="count-note" id="list-count">Статей: ${list.length}</p><div id="list-results">${listHTML(list)}</div>`;
  }
  function updateList() {
    const q=document.querySelector('#list-filter')?.value||'';
    const era=document.querySelector('#era-filter')?.value||'';
    let list=catalogList.filter(p=>(!q||searchScore(p,q)>0)&&(!era||p.era===era));
    const order=document.querySelector('#sort-filter')?.value;
    if(order==='title')list.sort((a,b)=>a.title.localeCompare(b.title,'ru'));
    if(order==='price')list.sort((a,b)=>price(a)-price(b));
    document.querySelector('#list-results').innerHTML=listHTML(list);
    document.querySelector('#list-count').textContent='Статей: '+list.length;
  }
  function price(p) {const val=p.stats.find(([k])=>k.includes('Стоимость'))?.[1]; return val?parseFloat(val.replace(/[.\s]/g,'').replace(',','.')):Infinity;}
  function updateCalculators() {
    for(const form of document.querySelectorAll('[data-calc]')) {
      const x=Number(form.elements.first.value),y=Number(form.elements.second.value),out=form.querySelector('output');
      if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||form.elements.first.value===''||form.elements.second.value===''){out.textContent='Введи два неотрицательных числа.';continue;}
      if(form.dataset.calc==='cottage'){out.textContent='Доход до налогов: '+(x*y/100).toLocaleString('ru-RU',{maximumFractionDigits:2})+' монет в час';continue;}
      if(form.dataset.calc==='happinness'){out.textContent=x+y>0?'Счастье: '+(x/(x+y)*100).toLocaleString('ru-RU',{maximumFractionDigits:2})+'%':'При нулевых очках процент не определяется.';continue;}
      if(y===0){out.textContent='При нулевой выработке завершить работу нельзя.';continue;}
      const minutes=Math.ceil(x/y*60),days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),mins=minutes%60;
      out.textContent='Примерно: '+(days?days+' д. ':'')+hours+' ч. '+mins+' мин.';
    }
  }
  function about() {
    main.innerHTML=h1('О личной вики')+`<p>Справочник подготовлен для игры на <strong>Cristalix</strong> с навигацией и спокойным оформлением в духе старой CivCraft Вики VimeWorld. Тексты объяснений написаны заново; игровые числа и названия получены из указанных официальных страниц.</p><h2>Что проверено</h2><ul><li>Прочитано ${db.meta.cristalixPages} страниц Cristalix, включая каталоги, механику, команды и обновление.</li><li>Каталоги содержат ${db.meta.buildings} здания и ${db.meta.wonders} чуда света.</li><li>Собраны ${db.meta.variants} вкладки источника с уровнями, вариантами и правилами. В личную вики перенесены справочные значения; полные правила открываются по ссылке.</li><li>В древе сохранено ${db.meta.technologies} записей технологий, включая чудеса.</li><li>VimeWorld: прочитано страниц — ${db.meta.vimePagesRead}. ${db.meta.vimePagesLimited ? "Часть страниц ограничена сайтом: " + db.meta.vimePagesLimited : "Проверены страница-образец и весь связанный с ней каталог разделов. Служебные страницы и произвольные вложенные статьи не включены в это число."}</li><li>Значения проверены по страницам, а не непосредственно внутри игры.</li></ul><h2>Как устроены статьи</h2><p>Сначала идут простое описание и характеристики, затем применение, таблицы, уровни, команды и источники. Архивные данные VimeWorld помещаются в отдельный подписанный раздел и не заменяют значения Cristalix.</p><h2>Известные расхождения</h2><ul><li>Коттедж 3-го уровня: таблица даёт 700 монет в час, а пример внизу официальной статьи использует 600. Калькулятор предлагает ввести нужную базу вручную.</li><li>Пушечные сооружения: 128 блоков в описании, 130 в пояснении.</li><li>Культура: столбец назван количеством чанков, пояснение — радиусом.</li><li>У Колосса расходятся области действия налогового эффекта; у Темпло-Майор неоднозначно записан банковский бонус.</li><li>Начальные рецепты лагеря и флага не восстановлены по старой вики: используй /quest и /crafts на Cristalix.</li></ul><h2>Мои данные</h2><p>Избранное и заметки хранятся в локальном хранилище браузера. Они не отправляются на сервер. Другая программа или адрес сайта могут иметь отдельное хранилище. Сохрани копию перед переносом вики.</p><div class="tabs-inline"><button id="export-notes">Сохранить заметки и избранное</button><label for="import-notes" class="sr-only">Восстановить заметки из JSON</label><input type="file" id="import-notes" accept=".json,application/json"></div><p id="backup-status" class="status" role="status"></p><h2>Источники</h2><p>${external('https://civcraft-wiki.cristalix.gg/','Официальная вики Cristalix')} · ${external(db.oldReference,'Вики VimeWorld')}</p><p>Дата снимка — 25 ноября 2026. Автоматической синхронизации нет; баланс может измениться. Это личный неофициальный справочник, который не редактирует сайты проектов.</p>`;
  }
  function route() {
    const raw=location.hash.replace(/^#\/?/,'')||'home';
    const split=raw.indexOf('?'),path=decodeURIComponent(split<0?raw:raw.slice(0,split)),params=new URLSearchParams(split<0?'':raw.slice(split+1));
    document.querySelector('#sidebar').classList.remove('open');document.querySelector('#menu').setAttribute('aria-expanded','false');
    currentId=path;
    if(path==='random'){location.hash=url(pages[Math.floor(Math.random()*pages.length)].id);return;}
    if(path==='home')homepage();
    else if(path==='all')listing([...pages],'Все статьи');
    else if(path==='buildings')listing(pages.filter(p=>p.isBuilding),'Здания и улучшения');
    else if(path==='favorites')listing(favorites.map(id=>byId.get(id)).filter(Boolean),'Избранное');
    else if(path==='search') {const q=params.get('q')||'';searchInput.value=q;const list=pages.map(p=>({p,score:searchScore(p,q)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);listing(list.map(x=>x.p),'Результаты поиска',q);}
    else if(path==='about')about();
    else if(path.startsWith('category/')){const cat=path.slice(9);listing(pages.filter(p=>p.category===cat),cat);}
    else if(byId.has(path))article(byId.get(path));
    else main.innerHTML=h1('Статья не найдена')+`<p>В личной вики пока нет такой страницы. ${a('all','Открыть все статьи')} или используй поиск.</p>`;
    document.querySelector('#article-tab').href=url(path);
    for(const el of document.querySelectorAll('.sidebar a'))el.setAttribute('aria-current',el.getAttribute('href')===url(path)?'page':'false');
    window.scrollTo(0,0);
  }
  document.querySelector('#search-form').addEventListener('submit',e=>{e.preventDefault();location.hash='#/search?q='+encodeURIComponent(searchInput.value.trim());});
  document.querySelector('.skip').addEventListener('click',e=>{e.preventDefault();main.focus();main.scrollIntoView();});
  document.querySelector('#menu').addEventListener('click',()=>{const open=document.querySelector('#sidebar').classList.toggle('open');document.querySelector('#menu').setAttribute('aria-expanded',String(open));});
  document.querySelector('#print').addEventListener('click',()=>{document.querySelectorAll('details').forEach(d=>d.open=true);window.print();});
  document.addEventListener('click',async e=>{
    const fav=e.target.closest('[data-favorite]');
    if(fav){const id=fav.dataset.favorite;favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];const ok=save('favorites',favorites);fav.textContent=favorites.includes(id)?'★ В избранном':'☆ В избранное';fav.setAttribute('aria-pressed',String(favorites.includes(id)));if(!ok)fav.textContent+=' (только в этой сессии)';}
    const anchor=e.target.closest('[data-anchor]');
    if(anchor){e.preventDefault();const target=document.getElementById(anchor.dataset.anchor);if(target?.tagName==='DETAILS')target.open=true;target?.scrollIntoView({behavior:'smooth'});}
    const copy=e.target.closest('[data-copy]');
    if(copy){try{await navigator.clipboard.writeText(copy.dataset.copy);copy.textContent='Готово';document.querySelector('#copy-status').textContent='Скопирована команда: '+copy.dataset.copy;}catch{document.querySelector('#copy-status').textContent='Браузер не разрешил копирование. Выдели текст команды и нажми Ctrl+C.';}}
    if(e.target.closest('#export-notes')){
      const notes={};pages.forEach(p=>{const n=load('note-'+p.id,'');if(n)notes[p.id]=n;});
      const blob=new Blob([JSON.stringify({format:'civcraft-personal-v1',favorites,notes},null,2)],{type:'application/json'}),href=URL.createObjectURL(blob),el=document.createElement('a');el.href=href;el.download='CivCraft-мои-заметки.json';el.click();setTimeout(()=>URL.revokeObjectURL(href),1000);document.querySelector('#backup-status').textContent='Резервная копия подготовлена.';
    }
  });
  document.addEventListener('input',e=>{
    if(e.target.matches('#list-filter'))updateList();
    if(e.target.matches('#tech-search')) {const q=canonical(e.target.value);document.querySelector('#tech-table').innerHTML=techTable(byId.get('techtree').techs.filter(t=>canonical(t.name+' '+t.requires).includes(q)));}
    if(e.target.closest('[data-calc]'))updateCalculators();
    if(e.target.matches('[data-note]')){const ok=save('note-'+e.target.dataset.note,e.target.value);document.querySelector('#note-status').textContent=ok?'Заметка сохранена в этом браузере.':'Не удалось сохранить: локальное хранилище недоступно. Скопируй заметку в файл.';}
  });
  document.addEventListener('change',async e=>{
    if(e.target.matches('#era-filter,#sort-filter'))updateList();
    if(e.target.matches('#import-notes')&&e.target.files[0]){try{const data=JSON.parse(await e.target.files[0].text());if(data.format!=='civcraft-personal-v1'||!Array.isArray(data.favorites)||!data.notes||typeof data.notes!=='object')throw Error('Неверный формат копии');favorites=[...new Set([...favorites,...data.favorites.filter(id=>typeof id==='string'&&byId.has(id))])];if(!save('favorites',favorites))throw Error('Хранилище недоступно');for(const [id,note]of Object.entries(data.notes)){if(byId.has(id)&&typeof note==='string'&&note.length<100000){if(!save('note-'+id,note))throw Error('Хранилище заполнено');}}document.querySelector('#backup-status').textContent='Избранное объединено, заметки из копии восстановлены.';}catch(err){document.querySelector('#backup-status').textContent='Не удалось прочитать копию: '+err.message;}}
  });
  document.addEventListener('submit',e=>{if(e.target.matches('[data-calc]'))e.preventDefault();});
  window.addEventListener('hashchange',route);
  window.addEventListener('beforeprint',()=>{document.querySelectorAll('details').forEach(d=>d.open=true);});
  route();
})();
