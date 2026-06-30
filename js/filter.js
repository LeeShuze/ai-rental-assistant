// 常规筛选、分页和房源列表逻辑
const inputs = [...document.querySelectorAll('#filterModule input[type="checkbox"], #filterModule input[type="radio"]')];
    const resultCount = document.getElementById('resultCount');
    const selectedList = document.getElementById('selectedList');
    const hintArea = document.getElementById('hintArea');
    const keyword = document.getElementById('keyword');
    const landmarkInput = document.getElementById('landmarkInput');
    const minRent = document.getElementById('minRent');
    const maxRent = document.getElementById('maxRent');
    const roommateGroup = document.getElementById('roommateGroup');

    function labelText(input){
      const label = document.querySelector(`label[for="${input.id}"]`);
      return label ? label.textContent.trim() : "";
    }

    function selectedValues(){
      const values = [];
      inputs.filter(i => i.checked && !i.dataset.all).forEach(i => values.push({id:i.id,text:labelText(i)}));
      if(keyword.value.trim()) values.push({id:'keyword',text:'搜索：'+keyword.value.trim()});
      if(landmarkInput.value.trim()) values.push({id:'landmark',text:'地点：'+landmarkInput.value.trim()});
      if(minRent.value || maxRent.value){
        values.push({id:'customRent',text:`租金：${minRent.value || 0}–${maxRent.value || '不限'}元`});
      }
      return values;
    }


    const sampleHouseGrid = document.getElementById('sampleHouseGrid');
    const sampleHouseCount = document.getElementById('sampleHouseCount');
    const sampleHousePagination = document.getElementById('sampleHousePagination');
    const sortSelect = document.getElementById('sortSelect');
    const pageSize = 20;
    let currentPage = 1;
    let currentMatchedHouses = [];

function getGroupSelections(groupName){
      const grid = [...document.querySelectorAll('#filterModule .option-grid')]
        .find(item => item.dataset.group === groupName);
      if(!grid) return [];
      return [...grid.querySelectorAll('input:checked')]
        .filter(input => !input.dataset.all)
        .map(input => labelText(input))
        .filter(Boolean);
    }

    function matchesAny(values, selected){
      return selected.length === 0 || selected.some(item => values.includes(item));
    }

    function matchesAll(values, selected){
      return selected.length === 0 || selected.every(item => values.includes(item));
    }

    function getPriceRange(){
      const selected = getGroupSelections('租金')[0];
      const ranges = {
        '1000元以下':[0,999],
        '1000–1500元':[1000,1500],
        '1500–2000元':[1500,2000],
        '2000–2500元':[2000,2500],
        '2500–3000元':[2500,3000],
        '3000–5000元':[3000,5000],
        '5000元以上':[5001,Infinity]
      };
      return ranges[selected] || [0,Infinity];
    }

    function getAreaRange(){
      const selected = getGroupSelections('面积')[0];
      const ranges = {
        '20㎡以下':[0,19.99],
        '20–40㎡':[20,40],
        '40–60㎡':[40,60],
        '60–90㎡':[60,90],
        '90㎡以上':[90.01,Infinity]
      };
      return ranges[selected] || [0,Infinity];
    }

    function getCommuteLimit(){
      const selected = getGroupSelections('通勤')[0];
      return {'30分钟内':30,'45分钟内':45,'60分钟内':60,'90分钟内':90}[selected] || Infinity;
    }

    function getMatchedSampleHouses(){
      const regions = getGroupSelections('区域');
      const subways = getGroupSelections('地铁');
      const rentalSelections = getGroupSelections('方式');
      const roommateSelections = getGroupSelections('合租偏好');
      const layouts = getGroupSelections('户型');
      const brands = getGroupSelections('品牌');
      const orientations = getGroupSelections('朝向');
      const decorations = getGroupSelections('装修');
      const floors = getGroupSelections('楼层');
      const elevators = getGroupSelections('电梯');
      const configs = getGroupSelections('房屋配置');
      const terms = getGroupSelections('租期');
      const features = getGroupSelections('特色');
      const leases = getGroupSelections('租赁条件');
      const life = getGroupSelections('生活偏好');
      const trust = getGroupSelections('房源保障');

      const [priceMin,priceMax] = getPriceRange();
      const [areaMin,areaMax] = getAreaRange();
      const customMin = Number(minRent.value || 0);
      const customMax = Number(maxRent.value || Infinity);
      const commuteLimit = getCommuteLimit();

      const baseModeSelections = rentalSelections.filter(item => ['整租','合租'].includes(item));
      const roomModeSelections = rentalSelections.filter(item => ['单间','主卧','次卧'].includes(item));
      const rentalTermSelections = rentalSelections.filter(item => ['短租','月租'].includes(item));
      const normalLayouts = layouts.filter(item => item !== '独立卫浴房间');
      const needPrivateBathRoom = layouts.includes('独立卫浴房间');

      const searchTokens = [keyword.value.trim(), landmarkInput.value.trim()]
        .filter(Boolean)
        .map(item => item.toLowerCase());

      let matched = (window.__sampleHouses || []).filter(house => {
        const searchable = [
          house.name,house.area,house.location,house.platform,house.operator,house.priceText,house.layoutText,...house.subways,...house.rental,...house.layouts,
          house.brand,...house.orientation,...house.decoration,house.floor,house.elevator,
          ...house.configs,...house.terms,...house.features,...house.leases,...house.life,
          ...house.trust,...house.keywords
        ].join(' ').toLowerCase();

        return (
          matchesAny([house.area], regions) &&
          matchesAny(house.subways, subways) &&
          matchesAny(house.rental, baseModeSelections) &&
          matchesAny(house.rental, roomModeSelections) &&
          matchesAll(house.rental, rentalTermSelections) &&
          matchesAll(house.roommate, roommateSelections) &&
          ((!hasKnownPrice(house) && priceMin === 0 && priceMax === Infinity && !customMin && customMax === Infinity) ||
          (hasKnownPrice(house) && house.price >= priceMin && house.price <= priceMax &&
          house.price >= customMin && house.price <= customMax)) &&
          matchesAny(house.layouts, normalLayouts) &&
          (!needPrivateBathRoom || house.configs.includes('独立卫生间')) &&
          house.size >= areaMin && house.size <= areaMax &&
          matchesAny([house.brand], brands) &&
          matchesAny(house.orientation, orientations) &&
          matchesAny(house.decoration, decorations) &&
          matchesAny([house.floor], floors) &&
          matchesAny([house.elevator], elevators) &&
          matchesAll(house.configs, configs) &&
          matchesAll(house.terms, terms) &&
          matchesAll(house.features, features) &&
          matchesAll(house.leases, leases) &&
          matchesAll(house.life, life) &&
          matchesAll(house.trust, trust) &&
          house.commute <= commuteLimit &&
          searchTokens.every(token => searchable.includes(token))
        );
      });

      const sortValue = sortSelect.value;
      if(sortValue === '最新发布') matched.sort((a,b) => a.newness - b.newness);
      else if(sortValue === '租金从低到高') matched.sort((a,b) => (a.price || Infinity) - (b.price || Infinity));
      else if(sortValue === '租金从高到低') matched.sort((a,b) => (b.price || -1) - (a.price || -1));
      else if(sortValue === '距离从近到远' || sortValue === '通勤时间从短到长') matched.sort((a,b) => a.commute - b.commute);
      else if(sortValue === '房源可信度从高到低') matched.sort((a,b) => b.credibility - a.credibility);
      else if(sortValue === '匹配度从高到低') matched.sort((a,b) => b.credibility - a.credibility);
      else matched.sort((a,b) => (b.credibility + Math.max(0,40-b.commute)) - (a.credibility + Math.max(0,40-a.commute)));

      return matched;
    }

    function renderSamplePagination(total){
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      currentPage = Math.min(Math.max(1, currentPage), totalPages);

      if(total === 0){
        sampleHousePagination.innerHTML = '';
        return;
      }

      const start = (currentPage - 1) * pageSize + 1;
      const end = Math.min(currentPage * pageSize, total);
      const pages = [];
      const pageSet = new Set([1,totalPages,currentPage,currentPage-1,currentPage+1]);
      [...pageSet].filter(p => p >= 1 && p <= totalPages).sort((a,b)=>a-b).forEach((p,idx,arr)=>{
        if(idx && p - arr[idx-1] > 1) pages.push('<span class="page-status">...</span>');
        pages.push(`<button class="page-btn ${p === currentPage ? 'active' : ''}" type="button" data-page="${p}">${p}</button>`);
      });

      sampleHousePagination.innerHTML = `
        <button class="page-btn" type="button" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
        ${pages.join('')}
        <button class="page-btn" type="button" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
        <span class="page-status">第${currentPage}/${totalPages}页，当前${start}—${end}套，共${total}套</span>
      `;
    }

    function renderSampleHouses(matched){
      currentMatchedHouses = matched;
      sampleHouseCount.textContent = matched.length;

      if(!matched.length){
        sampleHouseGrid.innerHTML = '<div class="sample-house-empty">没有房源同时满足当前条件。可点击“清空条件”回到“全部”，或放宽部分筛选条件。</div>';
        sampleHousePagination.innerHTML = '';
        return;
      }

      const totalPages = Math.max(1, Math.ceil(matched.length / pageSize));
      currentPage = Math.min(Math.max(1, currentPage), totalPages);
      const pageItems = matched.slice((currentPage - 1) * pageSize, currentPage * pageSize);

      sampleHouseGrid.innerHTML = pageItems.map(house => {
        const primaryLayout = displayLayout(house);
        const displayTags = [
          house.rental.includes('整租') ? '整租' : '合租',
          house.decoration.find(item => item !== '暂无数据') || '',
          house.features.includes('近地铁') ? '近地铁' : '',
          house.leases.includes('押一付一') ? '押一付一' : '',
          house.life.includes('允许养宠物') ? '宠物友好' : '',
          house.features.includes('随时看房') ? '随时看房' : '',
          house.platform
        ].filter(Boolean).slice(0,6);
        const photoReady = house.hasPhoto === true;
        const source = `${house.platform} · ${displayOperator(house)}`;

        return `
          <article class="sample-house-card" data-house-id="${house.id}" role="button" tabindex="0" aria-label="查看${house.name}详情">
            <div class="sample-house-cover ${photoReady ? 'photo-ready' : 'photo-pending'}">
              <span class="sample-house-number">房源 ${String(house.id).padStart(3,'0')}</span>
              <span class="sample-house-photo-text">${photoReady ? '示例图片' : '图片拍摄中'}</span>
              <span class="sample-house-match">可信度 ${house.credibility}%</span>
            </div>

            <div class="sample-house-body">
              <div class="sample-house-name">${house.name}</div>
              <div class="sample-house-meta">
                ${house.location || house.area} · ${displaySubway(house)} · 通勤约${house.commute}分钟
                <br>${displayArea(house)} · ${house.orientation.join('/')} · ${primaryLayout} · ${house.floor} · ${house.elevator}
              </div>
              <div class="sample-house-tags">
                ${displayTags.map(tag => `<span class="sample-house-tag">${tag}</span>`).join('')}
              </div>
              <div class="sample-house-submeta">${source} · ${house.newness === 1 ? '今天更新' : house.newness + '天前更新'}</div>
            </div>

            <div class="sample-house-price-wrap">
              <div class="sample-house-price">${displayRent(house)}</div>
              <div class="sample-house-source">${house.platform}</div>
            </div>
          </article>
        `;
      }).join('');

      renderSamplePagination(matched.length);
    }

    function resetFilterToAll(){
      inputs.forEach(input => {
        input.checked = Boolean(input.dataset.all);
      });
      keyword.value = '';
      landmarkInput.value = '';
      minRent.value = '';
      maxRent.value = '';
      roommateGroup.classList.add('collapsed');
      updateSummary();
    }


    function updateSummary(keepPage = false){
      if(keepPage !== true) currentPage = 1;
      const selected = selectedValues();
      selectedList.innerHTML = '';
      if(!selected.length){
        selectedList.innerHTML = '<span class="empty">当前为全部条件</span>';
      }else{
        selected.forEach(item=>{
          const tag=document.createElement('span');
          tag.className='selected-tag';
          tag.innerHTML=`${item.text}<button data-remove="${item.id}">×</button>`;
          selectedList.appendChild(tag);
        });
      }

      const matched = getMatchedSampleHouses();
      resultCount.textContent = matched.length;
      renderSampleHouses(matched);

      const restrictive = inputs.filter(i=>i.checked && !i.dataset.all).length +
        (keyword.value.trim()?1:0) + (landmarkInput.value.trim()?1:0) +
        (minRent.value || maxRent.value ? 1 : 0);

      if(matched.length === 0){
        hintArea.innerHTML='<div class="hint-box">当前条件没有匹配的房源。建议放宽区域、租金、通勤或房屋配置。</div>';
      }else if(matched.length <= 2){
        hintArea.innerHTML='<div class="hint-box">当前筛选条件较严格，只剩少量房源。</div>';
      }else if(restrictive >= 5){
        hintArea.innerHTML='<div class="ok-box">筛选范围较精准，可以直接比较当前房源。</div>';
      }else{
        hintArea.innerHTML='<div class="ok-box">当前为较宽泛的筛选范围，可继续增加条件缩小结果。</div>';
      }

      const isShared = ['m2','m3','m4','m5'].some(id => {
        const item = document.getElementById(id);
        return item && item.checked;
      });
      roommateGroup.classList.toggle('collapsed', !isShared);
    }

    inputs.forEach(i=>i.addEventListener('change', ()=>{
      const group = i.closest('.option-grid');
      if(group){
        const groupInputs = [...group.querySelectorAll('input')];
        const allInput = groupInputs.find(x=>x.dataset.all);
        const normalInputs = groupInputs.filter(x=>!x.dataset.all);
        if(i.dataset.all && i.checked){
          normalInputs.forEach(x=>x.checked=false);
        }else if(!i.dataset.all){
          if(i.checked && allInput) allInput.checked=false;
          if(!normalInputs.some(x=>x.checked) && allInput) allInput.checked=true;
        }
      }
      updateSummary();
    }));
    [keyword,landmarkInput,minRent,maxRent].forEach(i=>i.addEventListener('input', updateSummary));

    sampleHousePagination.addEventListener('click', e=>{
      const btn = e.target.closest('[data-page]');
      if(!btn) return;
      const totalPages = Math.max(1, Math.ceil(currentMatchedHouses.length / pageSize));
      const action = btn.dataset.page;
      if(action === 'prev') currentPage = Math.max(1, currentPage - 1);
      else if(action === 'next') currentPage = Math.min(totalPages, currentPage + 1);
      else currentPage = Number(action) || 1;
      renderSampleHouses(currentMatchedHouses);
      document.getElementById('sampleHousePanel').scrollIntoView({behavior:'smooth', block:'start'});
    });

    document.getElementById('selectedList').addEventListener('click', e=>{
      const id=e.target.dataset.remove;
      if(!id) return;
      if(id==='keyword') keyword.value='';
      else if(id==='landmark') landmarkInput.value='';
      else if(id==='customRent'){minRent.value='';maxRent.value='';}
      else{
        const input=document.getElementById(id);
        if(input){
          input.checked=false;
          const group=input.closest('.option-grid');
          if(group){
            const normalInputs=[...group.querySelectorAll('input')].filter(x=>!x.dataset.all);
            const allInput=[...group.querySelectorAll('input')].find(x=>x.dataset.all);
            if(allInput && !normalInputs.some(x=>x.checked)) allInput.checked=true;
          }
        }
      }
      updateSummary();
    });

    document.getElementById('locationTabs').addEventListener('click',e=>{
      if(!e.target.matches('.tab')) return;
      [...e.currentTarget.children].forEach(t=>t.classList.remove('active'));
      e.target.classList.add('active');
      document.querySelectorAll('.location-content').forEach(c=>c.classList.remove('active'));
      document.getElementById(e.target.dataset.target).classList.add('active');
    });

    document.getElementById('rentModeTabs').addEventListener('click',e=>{
      if(!e.target.matches('.tab')) return;
      [...e.currentTarget.children].forEach(t=>t.classList.remove('active'));
      e.target.classList.add('active');
    });

    document.getElementById('moreBtn').addEventListener('click',()=>{
      const advanced=document.getElementById('advanced');
      const opened=!advanced.classList.contains('collapsed');
      advanced.classList.toggle('collapsed');
      document.getElementById('moreBtn').textContent=opened?'展开更多筛选':'收起更多筛选';
    });

    document.getElementById('clearBtn').addEventListener('click', resetFilterToAll);

    document.getElementById('searchBtn').addEventListener('click',updateSummary);
    sortSelect.addEventListener('change', updateSummary);
    document.getElementById('aiSearchBtn').addEventListener('click',()=>{
      updateSummary();
      hintArea.innerHTML='<div class="ok-box"><strong>AI搜索已启动：</strong>系统将结合当前筛选条件，并进一步理解你的通勤、预算和生活偏好。</div>';
      const btn=document.getElementById('aiSearchBtn');
      const old=btn.textContent;
      btn.textContent='AI分析中…';
      setTimeout(()=>btn.textContent=old,1000);
    });
    document.getElementById('applyBtn').addEventListener('click',()=>{
      updateSummary();
      const btn=document.getElementById('applyBtn');
      const old=btn.textContent;
      btn.textContent='已应用';
      setTimeout(()=>btn.textContent=old,900);
    });

    document.querySelectorAll('.switch').forEach(sw=>{
      sw.addEventListener('click',()=>sw.classList.toggle('on'));
    });

    updateSummary();
