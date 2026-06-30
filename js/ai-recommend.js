// AI需求解析、智能推荐、横向对比和图表逻辑
(() => {
      const filterModule = document.getElementById('filterModule');
      const aiModule = document.getElementById('aiModule');
      const filterModeBtn = document.getElementById('filterModeBtn');
      const aiModeBtn = document.getElementById('aiModeBtn');
      const aiNeedInput = document.getElementById('aiNeedInput');
      const aiChat = document.getElementById('aiChat');
      const followupPanel = document.getElementById('followupPanel');
      const recommendSection = document.getElementById('recommendSection');
      const recommendList = document.getElementById('recommendList');
      const compareSection = document.getElementById('aiCompareSection');
      const compareDock = document.getElementById('compareDock');

      const aiDestination = document.getElementById('aiDestination');
      const aiBudget = document.getElementById('aiBudget');
      const aiCommute = document.getElementById('aiCommute');
      const aiRentalType = document.getElementById('aiRentalType');
      const aiLeaseTerm = document.getElementById('aiLeaseTerm');
      const aiPriority = document.getElementById('aiPriority');
      const preferenceInputs = [...document.querySelectorAll('#aiPreferences input')];

      let currentScenario = '';
      let comparedHouses = [];

      function switchMode(mode){
        const ai = mode === 'ai';
        filterModule.classList.toggle('is-hidden', ai);
        aiModule.classList.toggle('is-hidden', !ai);
        filterModeBtn.classList.toggle('active', !ai);
        aiModeBtn.classList.toggle('active', ai);
        window.scrollTo({top:0, behavior:'smooth'});
      }

      filterModeBtn.addEventListener('click', () => switchMode('filter'));
      aiModeBtn.addEventListener('click', () => switchMode('ai'));
      document.getElementById('backToFilterBtn').addEventListener('click', () => {
        switchMode('filter');
      });


      function appendMessage(role, content){
        const row = document.createElement('div');
        row.className = `chat-message ${role}`;
        const avatar = document.createElement('div');
        avatar.className = 'chat-avatar';
        avatar.textContent = role === 'user' ? '我' : 'AI';
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.textContent = content;
        row.appendChild(avatar);
        row.appendChild(bubble);
        aiChat.appendChild(row);
        aiChat.scrollTop = aiChat.scrollHeight;
      }

      function setPreference(value, checked=true){
        const target = preferenceInputs.find(input => input.value === value);
        if(target) target.checked = checked;
      }

      function clearPreferences(){
        preferenceInputs.forEach(input => input.checked = false);
      }

      function inferScenario(text){
        if(/考研|备考|自习|学习/.test(text)) return '考研备考';
        if(/毕业|应届|实习/.test(text)) return '应届毕业生';
        if(/异地|刚来上海|外地/.test(text)) return '异地就业';
        if(/宠物|养猫|养狗|猫|狗/.test(text)) return '宠物友好';
        if(/通勤优先|离公司近|通勤短/.test(text)) return '通勤优先';
        if(/预算低|便宜|省钱|低预算/.test(text)) return '低预算';
        return currentScenario || '综合找房';
      }

      function parseNeed(text){
        const result = {
          scenario: inferScenario(text),
          destination: '',
          budget: '',
          commute: '',
          rental: '',
          lease: '',
          preferences: []
        };

        const budgetMatch = text.match(/(\d{3,5})\s*元?/);
        if(budgetMatch) result.budget = budgetMatch[1];

        const commuteMatch = text.match(/(\d{2,3})\s*分钟/);
        if(commuteMatch) result.commute = commuteMatch[1];

        if(/整租/.test(text) && /合租/.test(text)) result.rental = '均可';
        else if(/整租/.test(text)) result.rental = '整租';
        else if(/合租|单间|主卧|次卧/.test(text)) result.rental = '合租';

        if(/年租|一年/.test(text)) result.lease = '年租';
        else if(/半年/.test(text)) result.lease = '半年租';
        else if(/1.?3个月|一到三个月/.test(text)) result.lease = '1—3个月';
        else if(/4.?6个月|四到六个月/.test(text)) result.lease = '4—6个月';
        else if(/月租|短租/.test(text)) result.lease = '月租';

        const locations = ['张江高科','同济大学','五角场','陆家嘴','人民广场','徐家汇','漕河泾','虹桥','静安寺','上海大学','复旦大学','交通大学'];
        result.destination = locations.find(item => text.includes(item)) || '';

        const prefRules = [
          ['近地铁', /地铁|近地铁/],
          ['环境安静', /安静|不吵|噪声小/],
          ['允许养宠物', /宠物|养猫|养狗|猫|狗/],
          ['配备书桌', /书桌|学习桌/],
          ['采光良好', /采光|朝南|阳光/],
          ['独立卫生间', /独立卫生间|独卫/],
          ['押一付一', /押一付一/],
          ['无中介费', /无中介费|不要中介费|免中介费/],
          ['靠近自习室', /自习室|图书馆/]
        ];
        prefRules.forEach(([name, rule]) => {
          if(rule.test(text)) result.preferences.push(name);
        });

        if(result.scenario === '考研备考'){
          ['环境安静','配备书桌','靠近自习室'].forEach(item => {
            if(!result.preferences.includes(item)) result.preferences.push(item);
          });
        }
        if(result.scenario === '应届毕业生'){
          ['近地铁','押一付一'].forEach(item => {
            if(!result.preferences.includes(item)) result.preferences.push(item);
          });
        }
        if(result.scenario === '宠物友好' && !result.preferences.includes('允许养宠物')){
          result.preferences.push('允许养宠物');
        }
        return result;
      }

      function clearCompareVisuals(){
        const chartBox = document.getElementById('compareCharts');
        const conclusionBox = document.getElementById('compareConclusion');
        const tableBox = document.getElementById('compareTableWrap');
        if(chartBox) chartBox.innerHTML = '';
        if(conclusionBox) conclusionBox.innerHTML = '';
        if(tableBox) tableBox.innerHTML = '';
      }

      function clearAiCriteria(options = {}){
        const keepInput = options.keepInput === true;
        const keepScenario = options.keepScenario === true;

        if(!keepScenario){
          currentScenario = '';
          document.querySelectorAll('.scenario-btn').forEach(btn => btn.classList.remove('active'));
        }
        if(!keepInput) aiNeedInput.value = '';

        aiDestination.value = '';
        aiBudget.value = '';
        aiCommute.value = '';
        aiRentalType.value = '';
        aiLeaseTerm.value = '';
        aiPriority.value = '综合均衡';
        clearPreferences();

        comparedHouses = [];
        recommendList.innerHTML = '';
        recommendSection.classList.add('is-hidden');
        compareSection.classList.add('is-hidden');
        clearCompareVisuals();
        syncCompareButtons();
        updateCompareDock();
        updateProfile();
      }

      function applyParsedResult(result){
        currentScenario = result.scenario;
        document.querySelectorAll('.scenario-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.scenario === currentScenario);
        });

        aiDestination.value = result.destination || '';
        aiBudget.value = result.budget || '';
        aiCommute.value = ['30','45','60','90'].includes(result.commute) ? result.commute : '';
        aiRentalType.value = result.rental || '';
        aiLeaseTerm.value = result.lease || '';

        clearPreferences();
        result.preferences.forEach(item => setPreference(item));

        followupPanel.classList.remove('is-hidden');
        updateCompareDock();
        updateProfile();
      }

      function getPreferences(){
        return preferenceInputs.filter(input => input.checked).map(input => input.value);
      }

      function updateProfile(){
        const prefs = getPreferences();
        const completed = [
          !!currentScenario,
          !!aiDestination.value.trim(),
          !!aiBudget.value,
          !!aiCommute.value,
          !!aiRentalType.value,
          !!aiLeaseTerm.value,
          prefs.length > 0,
          !!aiPriority.value
        ].filter(Boolean).length;
        const progress = Math.max(20, Math.round(completed / 8 * 100));

        document.getElementById('profileProgressText').textContent = progress + '%';
        document.getElementById('profileProgressBar').style.width = progress + '%';

        const scenarioTags = document.getElementById('scenarioTags');
        scenarioTags.innerHTML = currentScenario
          ? `<span class="profile-tag">${currentScenario}</span>`
          : '<span class="profile-empty">尚未选择</span>';

        document.getElementById('profileDestination').textContent = aiDestination.value.trim() || '待补充';
        document.getElementById('profileBudget').textContent = aiBudget.value ? `${aiBudget.value}元/月以内` : '待补充';
        document.getElementById('profileCommute').textContent = aiCommute.value ? `${aiCommute.value}分钟以内` : '待补充';
        document.getElementById('profileRental').textContent = aiRentalType.value || '待补充';
        document.getElementById('profileLease').textContent = aiLeaseTerm.value || '待补充';
        document.getElementById('profilePriority').textContent = aiPriority.value || '综合均衡';

        const preferenceTags = document.getElementById('preferenceTags');
        preferenceTags.innerHTML = prefs.length
          ? prefs.map(pref => `<span class="profile-tag">${pref}</span>`).join('')
          : '<span class="profile-empty">尚未识别</span>';

        document.getElementById('profileStatus').textContent =
          progress >= 85 ? '可以生成较准确推荐' :
          progress >= 60 ? '还可补充少量信息' :
          '建议继续完善需求';
      }

      document.getElementById('parseNeedBtn').addEventListener('click', () => {
        const text = aiNeedInput.value.trim();
        if(!text){
          appendMessage('assistant','请先描述你的租房需求，或者点击下方示例。');
          return;
        }
        appendMessage('user', text);
        aiNeedInput.value = '';
        const result = parseNeed(text);
        clearAiCriteria({keepInput:true});
        applyParsedResult(result);

        const missing = [];
        if(!result.destination) missing.push('工作或学习地点');
        if(!result.budget) missing.push('最高预算');
        if(!result.commute) missing.push('可接受的通勤时间');
        if(!result.rental) missing.push('整租或合租');

        const identified = [
          result.scenario,
          result.destination,
          result.budget ? `预算${result.budget}元以内` : '',
          result.commute ? `通勤${result.commute}分钟以内` : '',
          result.rental,
          ...result.preferences
        ].filter(Boolean).join('、');

        appendMessage(
          'assistant',
          `我已识别：${identified || '部分生活偏好'}。` +
          (missing.length ? `\n还需要确认：${missing.join('、')}。` : '\n信息较完整，可以确认后生成推荐。')
        );
      });

      document.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          clearAiCriteria({keepInput:false, keepScenario:true});
          currentScenario = btn.dataset.scenario;
          document.querySelectorAll('.scenario-btn').forEach(item => item.classList.toggle('active', item === btn));
          const scenarioExamples = {
            '应届毕业生':'刚毕业到上海工作，预算2500元以内，希望整租或合租均可，最好近地铁。',
            '考研备考':'我想找有书桌的房源，最好适合学习办公。',
            '异地就业':'我刚来上海工作，预算3000元以内，通勤45分钟内，整租优先。',
            '通勤优先':'预算2500元以内，整租，近地铁，通勤45分钟内。',
            '低预算':'预算2500元以内，整租，近地铁，通勤45分钟内。',
            '宠物友好':'我养猫，希望整租，近地铁，允许养宠物，通勤45分钟内。'
          };
          aiNeedInput.value = scenarioExamples[currentScenario];
          updateProfile();
        });
      });

      document.querySelectorAll('.example-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          clearAiCriteria({keepInput:false});
          aiNeedInput.value = btn.dataset.example;
          aiNeedInput.focus();
        });
      });

      [aiDestination, aiBudget, aiCommute, aiRentalType, aiLeaseTerm, aiPriority, ...preferenceInputs]
        .forEach(control => control.addEventListener('input', updateProfile));

      document.getElementById('addQuestionBtn').addEventListener('click', () => {
        const questions = [];
        if(!aiRentalType.value) questions.push('你更倾向整租还是合租？');
        if(!aiLeaseTerm.value) questions.push('预计租住多长时间？');
        if(!aiBudget.value) questions.push('每月最高可接受多少预算？');
        if(!aiDestination.value.trim()) questions.push('主要工作或学习地点在哪里？');
        if(getPreferences().length < 2) questions.push('你更重视安静、采光、近地铁还是独立卫浴？');
        appendMessage('assistant', questions[0] || '你的基础需求已经比较完整。最后确认一下：预算、通勤和居住环境中，哪一项最不能妥协？');
      });


      function aiHouseTags(house){
        return [...new Set([
          ...house.features,
          ...house.leases,
          ...house.life,
          ...house.configs,
          ...house.trust
        ])];
      }

      function aiHouseType(house){
        const mode = house.rental.includes('整租') ? '整租' : '合租';
        const room = house.layouts[0]
          || (house.rental.includes('主卧') ? '主卧'
          : house.rental.includes('次卧') ? '次卧' : '单间');
        return `${mode}${room} · ${house.size}㎡ · ${house.floor} · ${house.elevator}`;
      }

      function destinationBonus(house, destination){
        const value = (destination || '').trim();
        if(!value) return 0;
        const searchable = [
          house.area, ...house.subways, ...house.keywords
        ].join(' ');
        if(searchable.includes(value)) return 18;

        const areaMap = {
          '张江高科':'浦东新区',
          '同济大学':'杨浦区',
          '五角场':'杨浦区',
          '陆家嘴':'浦东新区',
          '人民广场':'黄浦区',
          '徐家汇':'徐汇区',
          '漕河泾':'徐汇区',
          '虹桥':'长宁区',
          '静安寺':'静安区'
        };
        return areaMap[value] === house.area ? 10 : 0;
      }

      function scenarioBonus(house){
        const tags = aiHouseTags(house);
        let bonus = 0;

        if(currentScenario === '考研备考'){
          if(house.area === '杨浦区') bonus += 8;
          ['环境安静','配备书桌','靠近自习室','靠近高校'].forEach(item => {
            if(tags.includes(item)) bonus += 4;
          });
          if(house.rental.includes('合租')) bonus += 4;
        }else if(currentScenario === '应届毕业生'){
          if(house.price <= 2200) bonus += 8;
          ['近地铁','押一付一','无中介费','无服务费'].forEach(item => {
            if(tags.includes(item)) bonus += 4;
          });
          if(house.rental.includes('合租')) bonus += 5;
        }else if(currentScenario === '异地就业'){
          if(tags.includes('近地铁')) bonus += 5;
          if(tags.includes('近期可入住')) bonus += 4;
          if(tags.includes('可线上签约')) bonus += 3;
        }else if(currentScenario === '通勤优先'){
          bonus += Math.max(0, 12 - Math.round(house.commute / 5));
          if(tags.includes('近地铁')) bonus += 5;
        }else if(currentScenario === '低预算'){
          if(house.price <= 2000) bonus += 10;
          if(tags.includes('无中介费')) bonus += 4;
          if(tags.includes('无服务费')) bonus += 4;
        }else if(currentScenario === '宠物友好'){
          if(tags.includes('允许养宠物')) bonus += 14;
          if(house.rental.includes('整租')) bonus += 4;
        }
        return bonus;
      }

      function clampScore(value,min,max){
        return Math.max(min,Math.min(max,value));
      }

      function calculateScore(house){
        const budget = Number(aiBudget.value || 0);
        const commute = Number(aiCommute.value || 0);
        const prefs = getPreferences();
        const tags = aiHouseTags(house);
        let score = 0;

        // 预算匹配，最高24分：越低于预算越有优势，超预算会明显扣分。
        if(budget){
          if(hasKnownPrice(house)){
            const ratio = house.price / budget;
            if(ratio <= 1){
              score += clampScore(24 - Math.max(0, ratio - 0.65) * 10, 15, 24);
            }else{
              score += clampScore(15 - (ratio - 1) * 45, 0, 14);
            }
          }else{
            score += 8;
          }
        }else{
          score += hasKnownPrice(house)
            ? clampScore(18 - house.price / 8000 * 6, 9, 18)
            : 10;
        }

        // 通勤匹配，最高18分：越短越高；无通勤要求时，仍按模拟通勤给基础差异。
        if(commute){
          if(house.commute <= commute){
            score += clampScore(18 - (house.commute / commute) * 6, 10, 18);
          }else{
            score += clampScore(10 - (house.commute - commute) / 4, 0, 9);
          }
        }else{
          score += clampScore(16 - house.commute / 90 * 6, 8, 16);
        }

        // 租赁方式，最高12分。
        if(aiRentalType.value && aiRentalType.value !== '均可'){
          score += house.rental.includes(aiRentalType.value) ? 12 : 3;
        }else{
          score += 9;
        }

        // 租期，最高7分。
        if(aiLeaseTerm.value){
          score += house.terms.includes(aiLeaseTerm.value) ? 7 : 3;
        }else{
          score += 5;
        }

        // 偏好匹配，最高18分；无偏好时给中性分。
        if(prefs.length){
          const matchedPrefs = prefs.filter(pref => tags.includes(pref)).length;
          score += matchedPrefs / prefs.length * 18;
        }else{
          score += 11;
        }

        // 位置匹配，最高8分；无地点时给中性分。
        const locationBonus = aiDestination.value.trim()
          ? destinationBonus(house, aiDestination.value) / 18 * 8
          : 5;
        score += clampScore(locationBonus,0,8);

        // 房源可信度，最高8分。
        score += clampScore((house.credibility - 70) / 30 * 8,0,8);

        // 更新新鲜度，最高5分。
        score += clampScore(5 - Math.max(0,house.newness - 1) * .25,1,5);

        // 用户场景修正，最高4分。
        score += clampScore(scenarioBonus(house) / 6,0,4);

        // 优先级修正，最高4分。
        if(aiPriority.value === '预算优先' && budget && hasKnownPrice(house)){
          score += clampScore((budget - house.price) / budget * 4,0,4);
        }
        if(aiPriority.value === '通勤优先'){
          const base = commute || 90;
          score += clampScore((base - house.commute) / base * 4,0,4);
        }
        if(aiPriority.value === '居住环境优先'){
          if(tags.includes('环境安静')) score += 2;
          if(tags.includes('采光良好')) score += 2;
        }

        return Math.round(clampScore(score,35,99));
      }

      function buildAiReasons(house){
        const reasons = [];
        const tags = aiHouseTags(house);
        const budget = Number(aiBudget.value || 0);
        const commute = Number(aiCommute.value || 0);

        if(budget && hasKnownPrice(house) && house.price <= budget) reasons.push(`月租${house.price}元，未超过当前预算`);
        else if(budget && hasKnownPrice(house)) reasons.push(`租金高于预算${house.price - budget}元，但其他条件匹配较好`);
        else if(budget) reasons.push('租金字段暂无数据，需要向来源平台进一步咨询');

        if(commute && house.commute <= commute) reasons.push(`模拟通勤约${house.commute}分钟，满足通勤要求`);
        else reasons.push(`模拟通勤约${house.commute}分钟`);

        if(tags.includes('环境安静')) reasons.push('环境安静，适合备考或居家办公');
        if(tags.includes('配备书桌')) reasons.push('配备书桌，可直接用于学习和办公');
        if(tags.includes('允许养宠物')) reasons.push('支持宠物友好需求');
        if(tags.includes('押一付一')) reasons.push('支持押一付一，首次支付压力较低');
        if(tags.includes('无中介费')) reasons.push('无中介费，可减少签约成本');
        if(tags.includes('近地铁')) reasons.push('靠近地铁，日常出行更方便');
        if(house.configs.includes('独立卫生间')) reasons.push('带独立卫生间，居住私密性较好');

        return [...new Set(reasons)].slice(0,3);
      }

      function buildAiTradeoff(house){
        const items = [];
        const budget = Number(aiBudget.value || 0);
        if(budget && hasKnownPrice(house) && house.price > budget) items.push(`超出预算${house.price - budget}元`);
        if(budget && !hasKnownPrice(house)) items.push('租金待咨询');
        if(house.elevator === '无电梯' && house.floor === '高楼层') items.push('高楼层且无电梯');
        if(house.orientation.includes('北')) items.push('朝北，需现场确认采光');
        if(house.commute > 60) items.push('通勤时间较长');
        if(!house.leases.includes('无服务费')) items.push('可能存在服务费');
        if(!items.length) items.push('需现场确认隔音、水压和实际采光');
        return `主要取舍：${items.slice(0,2).join('；')}。`;
      }

      function aiMatchesDestination(house,destination){
        const value = (destination || '').trim();
        if(!value) return true;
        const searchable = [
          house.name,house.area,house.location,house.platform,house.operator,
          ...house.subways,...house.keywords
        ].join(' ');
        return searchable.includes(value) || destinationBonus(house,value) > 0;
      }

      function getAiMatchedHouses(){
        const budget = Number(aiBudget.value || 0);
        const commute = Number(aiCommute.value || 0);
        const rentalType = aiRentalType.value;
        const leaseTerm = aiLeaseTerm.value;
        const destination = aiDestination.value.trim();
        const prefs = getPreferences();

        return (window.__sampleHouses || []).filter(house => {
          const tags = aiHouseTags(house);

          if(budget && (!hasKnownPrice(house) || house.price > budget)) return false;
          if(commute && house.commute > commute) return false;
          if(rentalType && rentalType !== '均可' && !house.rental.includes(rentalType)) return false;
          if(leaseTerm && !house.terms.includes(leaseTerm)) return false;
          if(destination && !aiMatchesDestination(house,destination)) return false;
          if(prefs.some(pref => !tags.includes(pref))) return false;

          return true;
        });
      }

      function renderRecommendations(){
        const destination = aiDestination.value.trim() || '上海全市';
        const matched = getAiMatchedHouses()
          .map(house => ({
            ...house,
            score:calculateScore(house),
            type:aiHouseType(house),
            tags:aiHouseTags(house),
            reasons:buildAiReasons(house),
            tradeoff:buildAiTradeoff(house)
          }))
          .sort((a,b) => b.score - a.score || (a.price || Infinity) - (b.price || Infinity));

        document.getElementById('recommendSummary').textContent =
          matched.length
            ? `以${destination}为范围，共找到${matched.length}套符合条件的房源，已按AI匹配度排序。`
            : `以${destination}为范围，暂无匹配房源。`;

        if(!matched.length){
          recommendList.innerHTML = '<div class="recommend-empty">暂无匹配房源</div>';
          comparedHouses = [];
          compareSection.classList.add('is-hidden');
          syncCompareButtons();
          updateCompareDock();
          recommendSection.classList.remove('is-hidden');
          recommendSection.scrollIntoView({behavior:'smooth',block:'start'});
          return;
        }

        const matchedIds = new Set(matched.map(house => house.id));
        comparedHouses = comparedHouses.filter(id => matchedIds.has(id));
        if(comparedHouses.length < 2) compareSection.classList.add('is-hidden');

        recommendList.innerHTML = matched.map((house,index) => `
          <article class="house-card" data-house-id="${house.id}" role="button" tabindex="0"
            aria-label="打开${house.name}">
            <div class="house-cover">
              <span class="house-rank">匹配 ${index + 1}</span>
              <div class="match-score">${house.score}<small>% 匹配</small></div>
            </div>
            <div class="house-body">
              <div class="house-name">${house.name}</div>
              <div class="house-basic">${house.type} · 通勤约${house.commute}分钟</div>
              <div class="house-price">${displayRent(house)}</div>
              <div class="reason-title">推荐理由</div>
              <ul class="reason-list">${house.reasons.map(item => `<li>${item}</li>`).join('')}</ul>
              <div class="tradeoff">${house.tradeoff}</div>
              <div class="card-actions">
                <button class="compare-btn ${comparedHouses.includes(house.id) ? 'added' : ''}"
                  type="button" data-compare-id="${house.id}">
                  ${comparedHouses.includes(house.id) ? '已加入对比' : '加入对比'}
                </button>
              </div>
            </div>
          </article>
        `).join('');

        updateCompareDock();
        recommendSection.classList.remove('is-hidden');
        recommendSection.scrollIntoView({behavior:'smooth',block:'start'});
      }

      const getHouse = id => (window.__sampleHouses || [])
        .find(house => Number(house.id) === Number(id));

      function toggleCompare(id){
        id = Number(id);
        if(comparedHouses.includes(id)){
          comparedHouses = comparedHouses.filter(item => item !== id);
        }else if(comparedHouses.length < 3){
          comparedHouses.push(id);
        }else{
          appendMessage('assistant','对比栏最多保留3套房源，请先移除一套。');
          return;
        }
        syncCompareButtons();
        updateCompareDock();
        if(comparedHouses.length < 2) compareSection.classList.add('is-hidden');
      }

      function syncCompareButtons(){
        recommendList.querySelectorAll('[data-compare-id]').forEach(btn => {
          const added = comparedHouses.includes(Number(btn.dataset.compareId));
          btn.classList.toggle('added',added);
          btn.textContent = added ? '已加入对比' : '加入对比';
        });
      }

      function compareMonthlyCost(house){
        if(!hasKnownPrice(house)) return Infinity;
        const tags = aiHouseTags(house);
        const service = tags.includes('无服务费') ? 0 : Math.round(house.price * .08);
        const agency = tags.includes('无中介费') ? 0 : Math.round(house.price * .5 / 12);
        return house.price + service + agency + 220;
      }

      function comparedObjects(){
        return comparedHouses.map(getHouse).filter(Boolean);
      }

      function updateCompareDock(){
        const selected = comparedObjects();
        compareDock.innerHTML = `
          <div class="compare-dock-title">
            <span>房源对比（解决“几套都不错，不知道选哪套”）</span>
            <span class="compare-dock-count">${selected.length}/3</span>
          </div>
          <ol class="compare-dock-steps">
            <li>在推荐卡片中点击“加入对比”</li>
            <li>选择2—3套正在犹豫的房源</li>
            <li>点击下方按钮查看差异与结论</li>
          </ol>
          <div class="compare-dock-items">
            ${selected.length ? selected.map(house => `
              <div class="compare-dock-item">
                <span>${house.name}</span>
                <button class="compare-remove-btn" type="button" data-remove-compare="${house.id}" title="移除">×</button>
              </div>`).join('') : '<div class="profile-empty">尚未选择房源</div>'}
          </div>
          <button class="compare-start-btn" type="button" data-start-compare
            ${selected.length < 2 ? 'disabled' : ''}>
            ${selected.length < 2 ? '至少选择2套房源' : '开始横向对比'}
          </button>
        `;
      }

      function safeChartText(value){
        return String(value ?? '').replace(/[&<>"']/g, s => ({
          '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[s]));
      }

      function chartShortName(name){
        return String(name || '房源');
      }

      function svgMultilineText(value,x,y,options = {}){
        const anchor = options.anchor || 'middle';
        const className = options.className || 'chart-label';
        const lineLength = options.lineLength || 12;
        const lineHeight = options.lineHeight || 14;
        const text = String(value || '房源');
        const chunks = text.match(new RegExp(`.{1,${lineLength}}`,'g')) || [text];
        return `<text class="${className}" x="${x}" y="${y}" text-anchor="${anchor}">
          ${chunks.map((chunk,index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}">${safeChartText(chunk)}</tspan>`).join('')}
        </text>`;
      }

      function renderBarChart(houses){
        const values = houses.map(h => ({
          name:chartShortName(h.name),
          rent:hasKnownPrice(h) ? h.price : 0,
          cost:h.monthlyCost === Infinity ? 0 : h.monthlyCost
        }));
        const maxValue = Math.max(1,...values.flatMap(v => [v.rent,v.cost]));
        const width = 760, height = 320, base = 215, top = 34;
        const groupW = 205, barW = 30;
        const bars = values.map((v,i) => {
          const x = 90 + i * groupW;
          const rentH = (v.rent / maxValue) * (base - top);
          const costH = (v.cost / maxValue) * (base - top);
          return `
            <rect class="chart-bar-a" x="${x}" y="${base-rentH}" width="${barW}" height="${rentH}" rx="5"></rect>
            <rect class="chart-bar-b" x="${x+barW+10}" y="${base-costH}" width="${barW}" height="${costH}" rx="5"></rect>
            <text class="chart-value" x="${x+barW/2}" y="${base-rentH-8}" text-anchor="middle">${v.rent ? v.rent : '待询'}</text>
            <text class="chart-value" x="${x+barW+10+barW/2}" y="${base-costH-8}" text-anchor="middle">${v.cost ? v.cost : '待询'}</text>
            ${svgMultilineText(v.name,x+35,238,{lineLength:13,lineHeight:15})}
          `;
        }).join('');
        return `
          <div class="compare-chart-card">
            <div class="compare-chart-title">柱状图：租金与月度综合成本</div>
            <svg viewBox="0 0 ${width} ${height}" role="img">
              <line class="chart-axis" x1="55" y1="${base}" x2="710" y2="${base}"></line>
              <line class="chart-axis" x1="55" y1="${top}" x2="55" y2="${base}"></line>
              <line class="chart-grid-line" x1="55" y1="80" x2="710" y2="80"></line>
              <line class="chart-grid-line" x1="55" y1="145" x2="710" y2="145"></line>
              <text class="chart-label" x="60" y="22">单位：元</text>
              ${bars}
              <rect class="chart-bar-a" x="560" y="18" width="12" height="12"></rect><text class="chart-label" x="578" y="29">租金</text>
              <rect class="chart-bar-b" x="620" y="18" width="12" height="12"></rect><text class="chart-label" x="638" y="29">综合成本</text>
            </svg>
          </div>
        `;
      }

      function renderLineChart(houses){
        const width = 760, height = 320, left = 60, right = 700, top = 34, bottom = 210;
        const points = houses.map((h,i) => {
          const x = houses.length === 1 ? (left + right) / 2 : left + (right-left) * i / (houses.length-1);
          const y = bottom - (h.score / 100) * (bottom - top);
          return {x,y,h};
        });
        const path = points.map((p,i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
        return `
          <div class="compare-chart-card">
            <div class="compare-chart-title">折线图：AI匹配度对比</div>
            <svg viewBox="0 0 ${width} ${height}" role="img">
              <line class="chart-axis" x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}"></line>
              <line class="chart-axis" x1="${left}" y1="${top}" x2="${left}" y2="${bottom}"></line>
              <line class="chart-grid-line" x1="${left}" y1="78" x2="${right}" y2="78"></line>
              <line class="chart-grid-line" x1="${left}" y1="122" x2="${right}" y2="122"></line>
              <line class="chart-grid-line" x1="${left}" y1="166" x2="${right}" y2="166"></line>
              <text class="chart-label" x="64" y="22">匹配度%</text>
              <path class="chart-line" d="${path}"></path>
              ${points.map(p => `
                <circle class="chart-point" cx="${p.x}" cy="${p.y}" r="6"></circle>
                <text class="chart-value" x="${p.x}" y="${p.y-12}" text-anchor="middle">${p.h.score}%</text>
                ${svgMultilineText(chartShortName(p.h.name),p.x,236,{lineLength:13,lineHeight:15})}
              `).join('')}
            </svg>
          </div>
        `;
      }

      function polar(cx,cy,r,angle){
        const rad = (angle - 90) * Math.PI / 180;
        return {x:cx + r * Math.cos(rad), y:cy + r * Math.sin(rad)};
      }

      function pieSlice(cx,cy,r,start,end){
        const s = polar(cx,cy,r,end), e = polar(cx,cy,r,start);
        const large = end - start <= 180 ? 0 : 1;
        return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} Z`;
      }

      function compareFeeData(house){
        const rent = Number(house.price || 0);
        if(!rent){
          return {service:0,intermediary:0,deposit:0,utilities:0,monthlyTotal:0,firstPayment:0,known:false};
        }
        const service = house.leases.includes('无服务费') ? 0 : Math.round(rent * .08);
        const intermediary = house.leases.includes('无中介费') ? 0 : Math.round(rent * .5);
        const deposit = house.leases.includes('押一付一') ? rent : rent * 2;
        const utilities = 220;
        const monthlyTotal = rent + service + utilities + Math.round(intermediary / 12);
        const firstPayment = rent + deposit + service + intermediary;
        return {service,intermediary,deposit,utilities,monthlyTotal,firstPayment,known:true};
      }

      function feeCompositionItems(house){
        const fees = compareFeeData(house);
        const items = fees.known
          ? [
              ['租金',house.price],
              ['押金',fees.deposit],
              ['服务费',fees.service],
              ['中介费',fees.intermediary],
              ['水电网',fees.utilities]
            ].filter(item => item[1] > 0)
          : [['待咨询',1]];
        const total = items.reduce((sum,item) => sum + item[1],0) || 1;
        return {fees,items,total};
      }

      function renderOnePieGroup(house,index){
        const {fees,items,total} = feeCompositionItems(house);
        const rowTop = 40 + index * 235;
        const cx = 150;
        const cy = rowTop + 105;
        const legendX = 320;
        const titleY = rowTop + 22;
        let angle = 0;

        const slices = items.map((item,idx) => {
          const next = angle + item[1] / total * 360;
          const path = pieSlice(cx,cy,72,angle,next);
          angle = next;
          return `<path class="chart-slice-${idx} chart-pie-divider" d="${path}"></path>`;
        }).join('');

        const legend = items.map((item,idx) => {
          const percent = Math.round(item[1] / total * 100);
          const y = rowTop + 64 + idx * 31;
          return `
            <rect class="chart-slice-${idx}" x="${legendX}" y="${y-12}" width="14" height="14" rx="2"></rect>
            <text class="chart-label" x="${legendX+24}" y="${y}">${safeChartText(item[0])}：${percent}%（${item[1]}元）</text>
          `;
        }).join('');

        return `
          <g>
            <text class="chart-value" x="45" y="${titleY}">房源${index + 1}</text>
            ${svgMultilineText(house.name,105,titleY,{anchor:'start',lineLength:24,lineHeight:15,className:'chart-value'})}
            ${slices}
            <circle cx="${cx}" cy="${cy}" r="35" fill="#fbfcfe"></circle>
            <text class="chart-pie-label" x="${cx}" y="${cy-4}" text-anchor="middle">首月</text>
            <text class="chart-label" x="${cx}" y="${cy+16}" text-anchor="middle">${fees.known ? fees.firstPayment + '元' : '待咨询'}</text>
            ${legend}
          </g>
        `;
      }

      function renderPieCharts(houses){
        const height = Math.max(310,houses.length * 235 + 50);
        return `
          <div class="compare-chart-card">
            <div class="compare-chart-title">饼状图：各房源首月支付构成</div>
            <svg viewBox="0 0 760 ${height}" style="height:${height}px;min-height:${height}px" role="img">
              ${houses.map((house,index) => renderOnePieGroup(house,index)).join('')}
            </svg>
          </div>
        `;
      }

      function renderCompareCharts(houses,best){
        const chartBox = document.getElementById('compareCharts');
        chartBox.innerHTML = renderBarChart(houses) + renderLineChart(houses) + renderPieCharts(houses);
      }

      function renderComparison(){
        const houses = comparedObjects().map(house => ({
          ...house,
          score:calculateScore(house),
          monthlyCost:compareMonthlyCost(house),
          reasons:buildAiReasons(house),
          tradeoff:buildAiTradeoff(house)
        }));
        if(houses.length < 2) return;

        const best = [...houses].sort((a,b) => b.score - a.score)[0];
        const cheapest = [...houses].sort((a,b) => a.monthlyCost - b.monthlyCost)[0];
        const fastest = [...houses].sort((a,b) => a.commute - b.commute)[0];

        document.getElementById('compareConclusion').innerHTML = `
          <div class="compare-conclusion-card primary"><strong>综合最推荐：${best.name}</strong>
            <span>匹配度${best.score}%，在预算、通勤和生活偏好之间最均衡。</span></div>
          <div class="compare-conclusion-card"><strong>总成本最低：${cheapest.name}</strong>
            <span>${cheapest.monthlyCost === Infinity ? "月度综合成本待咨询" : `月度综合成本约${cheapest.monthlyCost}元`}，适合预算优先。</span></div>
          <div class="compare-conclusion-card"><strong>通勤最短：${fastest.name}</strong>
            <span>模拟单程通勤约${fastest.commute}分钟，适合通勤优先。</span></div>`;

        renderCompareCharts(houses,best);

        const row = (label,render) => `<tr><th>${label}</th>${houses.map(h => `<td>${render(h)}</td>`).join('')}</tr>`;
        const finiteValues = key => houses.map(h => h[key]).filter(value => Number.isFinite(value));
        const min = key => Math.min(...finiteValues(key));
        const max = key => Math.max(...finiteValues(key));

        document.getElementById('compareTableWrap').innerHTML = `
          <table class="compare-table">
            <thead><tr><th>对比维度</th>${houses.map(h => `
              <th><button class="compare-house-link" type="button" data-compare-detail="${h.id}">${h.name}</button></th>
            `).join('')}</tr></thead>
            <tbody>
              ${row('AI匹配度',h => `<span class="${h.score === max('score') ? 'compare-best' : 'compare-score'}">${h.score}%</span>`)}
              ${row('标注租金',h => `<span class="${hasKnownPrice(h) && h.price === min('price') ? 'compare-best' : ''}">${displayRent(h)}</span>`)}
              ${row('月度综合成本',h => `<span class="${h.monthlyCost !== Infinity && h.monthlyCost === min('monthlyCost') ? 'compare-best' : ''}">${h.monthlyCost === Infinity ? '待咨询' : `约${h.monthlyCost}元`}</span>`)}
              ${row('模拟通勤',h => `<span class="${h.commute === min('commute') ? 'compare-best' : ''}">${h.commute}分钟</span>`)}
              ${row('租赁方式',h => h.rental.includes('整租') ? '整租' : '合租')}
              ${row('户型面积',h => `${displayLayout(h)} · ${displayArea(h)}`)}
              ${row('朝向楼层',h => `${h.orientation.join('/')} · ${h.floor}`)}
              ${row('电梯',h => h.elevator)}
              ${row('主要配置',h => [...new Set([...h.configs,...h.life])].slice(0,5).join('、') || '暂无数据')}
              ${row('推荐理由',h => h.reasons.join('；'))}
              ${row('主要取舍',h => `<span class="compare-warn">${h.tradeoff}</span>`)}
            </tbody>
          </table>`;

        compareSection.classList.remove('is-hidden');
        compareSection.scrollIntoView({behavior:'smooth',block:'start'});
      }

      recommendList.addEventListener('click', event => {
        const compareBtn = event.target.closest('[data-compare-id]');
        if(compareBtn){
          event.stopPropagation();
          toggleCompare(compareBtn.dataset.compareId);
          return;
        }
        const card = event.target.closest('[data-house-id]');
        if(card && typeof window.openHouseDetail === 'function'){
          window.openHouseDetail(card.dataset.houseId);
        }
      });

      recommendList.addEventListener('keydown', event => {
        if((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-house-id]')){
          event.preventDefault();
          window.openHouseDetail?.(event.target.dataset.houseId);
        }
      });

      compareDock.addEventListener('click', event => {
        const remove = event.target.closest('[data-remove-compare]');
        if(remove){
          event.preventDefault();
          toggleCompare(remove.dataset.removeCompare);
          return;
        }

        const startBtn = event.target.closest('[data-start-compare]');
        if(startBtn){
          event.preventDefault();
          if(startBtn.disabled || comparedHouses.length < 2){
            appendMessage('assistant','请先加入至少2套房源，再开始横向对比。');
            return;
          }
          try{
            renderComparison();
          }catch(error){
            console.error(error);
            appendMessage('assistant','横向对比生成失败，请重新加入房源后再试。');
          }
        }
      });

      document.getElementById('clearCompareBtn').addEventListener('click', () => {
        comparedHouses = [];
        compareSection.classList.add('is-hidden');
        const chartBox = document.getElementById('compareCharts');
        if(chartBox) chartBox.innerHTML = '';
        syncCompareButtons();
        updateCompareDock();
      });
      document.getElementById('closeCompareBtn').addEventListener('click', () =>
        compareSection.classList.add('is-hidden')
      );
      document.getElementById('compareTableWrap').addEventListener('click', event => {
        const link = event.target.closest('[data-compare-detail]');
        if(link) window.openHouseDetail?.(link.dataset.compareDetail);
      });

      document.getElementById('recommendBtn').addEventListener('click', () => {
        appendMessage('assistant','需求已确认。我正在按照预算、通勤、租赁方式和生活偏好筛选全部符合条件的房源，并标注每套房源的主要取舍。');
        updateProfile();
        renderRecommendations();
      });
      document.getElementById('refreshRecommendBtn').addEventListener('click', renderRecommendations);

      document.getElementById('syncFilterBtn').addEventListener('click', () => {
        if(typeof resetFilterToAll === 'function') resetFilterToAll();

        const setFilterOption = id => {
          const target = document.getElementById(id);
          if(!target) return;
          target.checked = true;
          const group = target.closest('.option-grid');
          const all = group ? group.querySelector('input[data-all="true"]') : null;
          if(all && all !== target) all.checked = false;
        };

        if(typeof keyword !== 'undefined') keyword.value = '';
        if(typeof landmarkInput !== 'undefined') landmarkInput.value = aiDestination.value.trim();
        if(typeof minRent !== 'undefined') minRent.value = '';
        if(typeof maxRent !== 'undefined') maxRent.value = aiBudget.value || '';

        const rentalMap = {'整租':'m1','合租':'m2'};
        if(rentalMap[aiRentalType.value]) setFilterOption(rentalMap[aiRentalType.value]);

        const commuteMap = {'30':'c1','45':'c2','60':'c3','90':'c4'};
        if(commuteMap[aiCommute.value]) setFilterOption(commuteMap[aiCommute.value]);

        const termMap = {'月租':'term1','年租':'term2','1个月起租':'term3','1—3个月':'term4','4—6个月':'term5','半年租':'term6'};
        if(termMap[aiLeaseTerm.value]) setFilterOption(termMap[aiLeaseTerm.value]);

        const prefMap = {
          '近地铁':'feature1',
          '环境安静':'life2',
          '允许养宠物':'life1',
          '配备书桌':'life4',
          '采光良好':'config6',
          '独立卫生间':'config1',
          '押一付一':'lease1',
          '无中介费':'lease2',
          '靠近自习室':'life5'
        };
        getPreferences().forEach(pref => {
          const id = prefMap[pref];
          if(id) setFilterOption(id);
        });

        if(typeof updateSummary === 'function') updateSummary();
        switchMode('filter');
      });

      document.getElementById('resetAiBtn').addEventListener('click', () => {
        currentScenario = '';
        comparedHouses = [];
        compareSection.classList.add('is-hidden');
        clearCompareVisuals();
        aiNeedInput.value = '';
        aiDestination.value = '';
        aiBudget.value = '';
        aiCommute.value = '';
        aiRentalType.value = '';
        aiLeaseTerm.value = '';
        aiPriority.value = '综合均衡';
        clearPreferences();
        followupPanel.classList.add('is-hidden');
        recommendSection.classList.add('is-hidden');
        document.querySelectorAll('.scenario-btn').forEach(btn => btn.classList.remove('active'));
        aiChat.innerHTML = `
          <div class="chat-message assistant">
            <div class="chat-avatar">AI</div>
            <div class="chat-bubble">你好，我是AI选房助手。你可以告诉我：在哪里上班或学习、每月预算、可接受的通勤时间，以及对整租、合租、安静程度、宠物等方面的要求。</div>
          </div>`;
        updateCompareDock();
        updateProfile();
      });

      // 原筛选页“AI搜索”按钮进入AI模块，并带入当前筛选条件
      const aiSearchEntry = document.getElementById('aiSearchBtn');
      if(aiSearchEntry){
        aiSearchEntry.addEventListener('click', () => {
          let carried = [];
          try{
            if(typeof selectedValues === 'function'){
              carried = selectedValues().map(item => item.text);
            }
          }catch(e){}
          if(carried.length){
            aiNeedInput.value = `请根据这些条件帮我进一步选房：${carried.join('、')}。`;
          }
          switchMode('ai');
        });
      }

      updateProfile();
    })();
