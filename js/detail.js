// 房源落地页、相似房源和位置周边逻辑
(() => {
      const detailModule = document.getElementById('houseDetailModule');
      const detailContent = document.getElementById('houseDetailContent');
      const filterModuleEl = document.getElementById('filterModule');
      const aiModuleEl = document.getElementById('aiModule');
      const detailToast = document.getElementById('detailToast');
      let previousMode = 'filter';
      let currentDetailHouseId = null;
      let toastTimer = null;

      const facilityIcons = {
        '独立卫生间':'🚿',
        '有阳台':'▣',
        '可做饭':'🍳',
        '家具齐全':'▤',
        '配备空调':'❄',
        '采光良好':'☀',
        '网络稳定':'⌁',
        '有停车位':'P',
        '支持电动车充电':'⚡',
        '配备书桌':'▱',
        '环境安静':'◌',
        '允许养宠物':'♧'
      };

      function showDetailToast(message){
        detailToast.textContent = message;
        detailToast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => detailToast.classList.remove('show'), 1800);
      }

      function getHouseById(id){
        return (window.__sampleHouses || []).find(house => Number(house.id) === Number(id));
      }

      function getCurrentSelectedLabels(){
        const labels = [];
        document.querySelectorAll('#filterModule .option-grid input:checked').forEach(input => {
          if(!input.dataset.all){
            const label = document.querySelector(`label[for="${input.id}"]`);
            if(label) labels.push(label.textContent.trim());
          }
        });
        return labels;
      }

      function calculateDetailScore(house){
        const selected = getCurrentSelectedLabels();
        const houseValues = [
          house.area, ...house.subways, ...house.rental, ...house.roommate,
          ...house.layouts, house.brand, ...house.orientation, ...house.decoration,
          house.floor, house.elevator, ...house.configs, ...house.terms,
          ...house.features, ...house.leases, ...house.life, ...house.trust
        ];
        const matched = selected.filter(item => houseValues.includes(item));
        const missed = selected.filter(item => !houseValues.includes(item));
        let score = Math.round(house.credibility * .62 + Math.max(0, 100 - house.commute) * .25);
        score += Math.min(12, matched.length * 2);
        score -= Math.min(10, missed.length * 2);
        score = Math.max(58, Math.min(98, score));
        return {score,matched,missed};
      }

      function getRisks(house){
        const risks = [];
        if(house.elevator === '无电梯' && house.floor === '高楼层') risks.push('高楼层且无电梯，搬运和日常上下楼成本较高');
        if(house.orientation.includes('北')) risks.push('朝北房间需现场确认冬季采光与潮湿情况');
        if(house.commute > 60) risks.push('模拟通勤时间较长，不适合通勤优先用户');
        if(!house.subways.length) risks.push('附近暂无地铁信息，需要重点核查公交和接驳条件');
        if(house.credibility < 88) risks.push('当前核验信息相对有限，签约前应进一步核实产权与费用');
        if(!house.leases.includes('无服务费')) risks.push('可能存在服务费，需在签约前确认收费周期和退费条件');
        if(!risks.length) risks.push('暂无明显结构性风险，仍建议现场检查隔音、水压、采光和设备状态');
        return risks;
      }

      function feeData(house){
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

      function galleryTemplate(house){
        const labels = ['客厅','卧室','厨房','卫生间','阳台'];
        const stateClass = house.hasPhoto ? 'photo-ready' : 'photo-pending';
        const stateText = house.hasPhoto ? '示例图片' : '图片拍摄中';
        return `
          <div class="detail-main-photo ${stateClass}" id="detailMainPhoto">
            <span class="detail-photo-badge">${stateText} · ${labels[0]}</span>
            <span id="detailMainPhotoText">${stateText}</span>
            <span class="detail-photo-count">${house.hasPhoto ? '1 / 5' : '等待上传'}</span>
          </div>
          <div class="detail-thumbnails">
            ${labels.map((label,index) => `
              <button class="detail-thumb ${stateClass} ${index === 0 ? 'active' : ''}"
                type="button" data-gallery-label="${label}" data-photo-state="${stateText}">
                ${label}
              </button>
            `).join('')}
          </div>
        `;
      }

      function keyTags(house){
        const tags = [
          house.rental.includes('整租') ? '整租' : '合租',
          house.features.includes('近地铁') ? '近地铁' : '',
          house.decoration[0],
          house.leases.includes('押一付一') ? '押一付一' : '',
          house.features.includes('随时看房') ? '随时看房' : '',
          house.trust.includes('官方核验房源') ? '官方核验' : '',
          house.life.includes('允许养宠物') ? '宠物友好' : ''
        ].filter(Boolean);
        return tags.slice(0,7);
      }

      function facilityTemplate(house){
        const items = [...new Set([
          ...house.configs,
          ...house.life.filter(item => facilityIcons[item])
        ])].slice(0,12);
        return items.map(item => `
          <div class="detail-facility">
            <div class="detail-facility-icon">${facilityIcons[item] || '✓'}</div>
            <div>${item}</div>
          </div>
        `).join('');
      }

      function similarTemplate(house){
        const all = window.__sampleHouses || [];
        const similar = all
          .filter(item => item.id !== house.id)
          .map(item => ({
            ...item,
            similarity:
              (item.area === house.area ? 3 : 0) +
              (Math.abs(item.price - house.price) <= 1200 ? 2 : 0) +
              (item.rental.some(value => house.rental.includes(value)) ? 1 : 0)
          }))
          .sort((a,b) => b.similarity - a.similarity)
          .slice(0,4);

        return similar.map(item => `
          <article class="detail-similar-card" data-detail-house-id="${item.id}" tabindex="0" role="button">
            <div class="detail-similar-cover ${item.hasPhoto ? 'photo-ready' : 'photo-pending'}">
              ${item.hasPhoto ? '示例图片' : '图片拍摄中'}
            </div>
            <div class="detail-similar-body">
              <div class="detail-similar-name">${item.name}</div>
              <div class="detail-similar-meta">${item.area} · ${displayArea(item)} · ${item.commute}分钟通勤</div>
              <div class="detail-similar-price">${displayRent(item)}</div>
            </div>
          </article>
        `).join('');
      }

      function mapKeyword(house){
        return [house.location,house.name,house.area].filter(Boolean).join(' ');
      }

      function mapExternalLinks(house){
        const keyword = encodeURIComponent(mapKeyword(house));
        return {
          amap:`https://uri.amap.com/search?keyword=${keyword}`,
          baidu:`https://map.baidu.com/search/${keyword}`
        };
      }

      function nearbyMetrics(house){
        const metroDistance = house.distanceMeters || (house.subways.length ? 520 : 1200);
        const busDistance = Math.max(180,Math.round(metroDistance * .48));
        const shopDistance = 260 + (house.id % 5) * 80;
        const foodDistance = 180 + (house.id % 6) * 70;
        const hospitalDistance = 650 + (house.id % 7) * 120;
        const schoolDistance = house.life.includes('靠近高校') ? 520 : 900 + (house.id % 6) * 150;
        return {metroDistance,busDistance,shopDistance,foodDistance,hospitalDistance,schoolDistance};
      }

      function meterText(value){
        return value >= 1000 ? (value / 1000).toFixed(1) + 'km' : Math.round(value) + 'm';
      }

      function locationTemplate(house){
        const links = mapExternalLinks(house);
        const d = nearbyMetrics(house);
        const subway = house.subways.join('、') || '暂无地铁字段';
        const location = house.location || `${house.area} · ${house.name}`;
        return `
          <div class="detail-map-tools">
            <div class="detail-map-address">
              <strong>${location}</strong>
              当前为无地图Key的原型示意图；可跳转第三方地图查看真实位置。
            </div>
            <div class="detail-map-links">
              <a class="detail-map-link" href="${links.amap}" target="_blank" rel="noopener noreferrer">高德地图查看</a>
              <a class="detail-map-link" href="${links.baidu}" target="_blank" rel="noopener noreferrer">百度地图查看</a>
            </div>
          </div>

          <div class="detail-map">
            <div class="detail-map-road"></div>
            <div class="detail-map-road secondary"></div>
            <div class="detail-map-ring"></div>
            <div class="detail-map-marker">${house.name}<span>${house.area} · ${subway}</span></div>
            <div class="detail-map-poi" style="left:12%;top:18%"><strong>轨道交通</strong>${subway}<br>约${meterText(d.metroDistance)}</div>
            <div class="detail-map-poi" style="right:10%;top:20%"><strong>便利购物</strong>便利店/超市<br>约${meterText(d.shopDistance)}</div>
            <div class="detail-map-poi" style="left:16%;bottom:18%"><strong>医疗服务</strong>社区医院<br>约${meterText(d.hospitalDistance)}</div>
            <div class="detail-map-poi" style="right:14%;bottom:16%"><strong>餐饮商圈</strong>餐饮/商场<br>约${meterText(d.foodDistance)}</div>
            <div class="detail-map-scale">约500m</div>
          </div>

          <div class="detail-route-grid">
            <div class="detail-route-card"><strong>步行到地铁</strong>${subway}<br>约${meterText(d.metroDistance)}，约${Math.max(5,Math.round(d.metroDistance / 80))}分钟</div>
            <div class="detail-route-card"><strong>公交接驳</strong>附近公交站<br>约${meterText(d.busDistance)}，适合短驳换乘</div>
            <div class="detail-route-card"><strong>模拟通勤</strong>到目标地点<br>单程约${house.commute}分钟</div>
          </div>

          <div class="detail-nearby-list">
            <div class="detail-nearby-item"><strong>轨道交通</strong><br>${subway}，步行距离约${meterText(d.metroDistance)}</div>
            <div class="detail-nearby-item"><strong>生活便利</strong><br>便利店/超市约${meterText(d.shopDistance)}，餐饮约${meterText(d.foodDistance)}</div>
            <div class="detail-nearby-item"><strong>医疗教育</strong><br>社区医院约${meterText(d.hospitalDistance)}，学校/学习点约${meterText(d.schoolDistance)}</div>
            <div class="detail-nearby-item"><strong>居住判断</strong><br>${house.features.includes('近地铁') ? '交通便利性较强' : '需重点核查接驳交通'}，${house.life.includes('环境安静') ? '安静属性较突出' : '建议实地确认噪声情况'}</div>
            <div class="detail-nearby-item"><strong>看房重点</strong><br>到地铁实际步行路线、夜间照明、电梯/楼道和周边噪声</div>
            <div class="detail-nearby-item"><strong>签约核查</strong><br>地址、房源编号、合同主体、费用项和退费规则需现场确认</div>
          </div>

          <div class="detail-map-note">
            说明：当前未配置高德/百度地图API Key，因此网页内展示的是原型示意地图；“高德地图查看 / 百度地图查看”会用房源名称和位置关键词跳转到第三方地图搜索。
          </div>
        `;
      }

      function renderDetailPage(house){
        const fees = feeData(house);
        const scoreResult = calculateDetailScore(house);
        const risks = getRisks(house);
        const layout = house.layouts[0] || (house.rental.includes('主卧') ? '主卧' : house.rental.includes('次卧') ? '次卧' : '单间');
        const titleMode = house.rental.includes('整租') ? '整租' : '合租';
        const selectedText = scoreResult.matched.length
          ? `符合当前筛选中的${scoreResult.matched.slice(0,4).join('、')}等条件。`
          : `该房源在通勤、可信度和基础配置方面表现较为均衡。`;
        const positive = [
          house.features.includes('近地铁') ? '距离轨道交通较方便' : '',
          house.configs.includes('独立卫生间') ? '带独立卫生间，居住私密性较好' : '',
          house.life.includes('环境安静') ? '适合备考或居家办公人群' : '',
          house.life.includes('允许养宠物') ? '支持宠物友好居住需求' : '',
          house.leases.includes('无中介费') ? '无中介费，可降低初次签约成本' : '',
          house.configs.includes('采光良好') ? '采光条件较好' : ''
        ].filter(Boolean);
        if(!positive.length) positive.push('基础租住信息完整，可作为同价位比较样本');

        detailContent.innerHTML = `
          <div class="detail-back-row">
            <button class="detail-back-btn" type="button" id="detailBackBtn">← 返回房源列表</button>
            <div class="detail-breadcrumb">上海租房 / ${house.area} / ${house.name}</div>
          </div>

          <section class="detail-title-block">
            <h1 class="detail-title">${titleMode} · ${house.name} ${layout} ${house.orientation.join('/')}</h1>
            <div class="detail-title-meta">
              <span>房源维护时间：${house.newness === 1 ? '今天' : house.newness + '天前'}</span>
              <span class="detail-verified">✓ 可信度 ${house.credibility}%</span>
              <span>房源数据编号：DATA-${String(house.id).padStart(4,'0')}</span>
              <span>本页面为该房源对应落地页，基于公开可访问字段进行产品功能演示，不构成真实租赁要约</span>
            </div>
          </section>

          <section class="detail-hero">
            <div class="detail-gallery">${galleryTemplate(house)}</div>

            <aside class="detail-summary-card">
              <div class="detail-summary-top">
                <div class="detail-price">${displayRent(house)}</div>
                <div class="detail-icon-actions">
                  <button class="detail-icon-btn" type="button" data-detail-action="favorite" title="收藏">♡</button>
                  <button class="detail-icon-btn" type="button" data-detail-action="share" title="分享">↗</button>
                </div>
              </div>

              <div class="detail-tags">
                ${keyTags(house).map(tag => `<span class="detail-tag">${tag}</span>`).join('')}
              </div>

              <div class="detail-key-metrics">
                <div class="detail-metric">
                  <strong>${titleMode}</strong><span>租赁方式</span>
                </div>
                <div class="detail-metric">
                  <strong>${layout} · ${displayArea(house)}</strong><span>户型面积</span>
                </div>
                <div class="detail-metric">
                  <strong>${house.orientation.join('/')} · ${house.floor}</strong><span>朝向楼层</span>
                </div>
              </div>

              <div class="detail-cost-card">
                <div class="detail-cost-title">
                  <span>月度综合成本估算</span>
                  <strong>${fees.known ? `约 ${fees.monthlyTotal} 元` : "待咨询"}</strong>
                </div>
                <div class="detail-cost-note">
                  包含租金、估算服务费、水电网费及一次性中介费的月均摊销；若租金暂无数据，则需进入来源平台咨询。
                </div>
              </div>

              <div class="detail-ai-brief">
                <div class="detail-ai-brief-title">AI一句话总结 · 匹配度 ${scoreResult.score}%</div>
                <div class="detail-ai-brief-text">${selectedText}主要需要关注：${risks[0]}。</div>
              </div>

              <div class="detail-contact-actions">
                <button class="detail-contact-btn primary" type="button" data-detail-action="contact">在线咨询</button>
                <button class="detail-contact-btn secondary" type="button" data-detail-action="appointment">预约看房</button>
              </div>
            </aside>
          </section>

          <nav class="detail-anchor-nav">
            <button class="detail-anchor-btn active" type="button" data-detail-target="detailOverview">房屋信息</button>
            <button class="detail-anchor-btn" type="button" data-detail-target="detailAiDecision">AI决策</button>
            <button class="detail-anchor-btn" type="button" data-detail-target="detailFees">费用详情</button>
            <button class="detail-anchor-btn" type="button" data-detail-target="detailDescription">房源描述</button>
            <button class="detail-anchor-btn" type="button" data-detail-target="detailLocation">位置周边</button>
            <button class="detail-anchor-btn" type="button" data-detail-target="detailSimilar">相似房源</button>
          </nav>

          <div class="detail-layout">
            <div class="detail-main">
              <section class="detail-section" id="detailOverview">
                <div class="detail-section-head">
                  <div>
                    <div class="detail-section-title">房屋信息</div>
                    <div class="detail-section-subtitle">整合链家/贝壳的信息完整度与58同城的配置展示方式</div>
                  </div>
                </div>

                <div class="detail-info-grid">
                  <div class="detail-info-item"><span>租赁方式</span><strong>${titleMode}</strong></div>
                  <div class="detail-info-item"><span>户型</span><strong>${layout}</strong></div>
                  <div class="detail-info-item"><span>建筑面积</span><strong>${displayArea(house)}</strong></div>
                  <div class="detail-info-item"><span>朝向</span><strong>${house.orientation.join('/')}</strong></div>
                  <div class="detail-info-item"><span>楼层</span><strong>${house.floor}</strong></div>
                  <div class="detail-info-item"><span>电梯</span><strong>${house.elevator}</strong></div>
                  <div class="detail-info-item"><span>装修</span><strong>${house.decoration.join('、')}</strong></div>
                  <div class="detail-info-item"><span>租期</span><strong>${house.terms.join('、')}</strong></div>
                  <div class="detail-info-item"><span>所在区域</span><strong>${house.area}</strong></div>
                  <div class="detail-info-item"><span>地铁</span><strong>${house.subways.join('、') || '暂无地铁信息'}</strong></div>
                  <div class="detail-info-item"><span>模拟通勤</span><strong>约 ${house.commute} 分钟</strong></div>
                  <div class="detail-info-item"><span>房源来源</span><strong>${house.platform} · ${displayOperator(house)}</strong></div>
                </div>

                <div class="detail-facility-grid">${facilityTemplate(house)}</div>
              </section>

              <section class="detail-section" id="detailAiDecision">
                <div class="detail-section-head">
                  <div>
                    <div class="detail-section-title">AI租房决策分析</div>
                    <div class="detail-section-subtitle">不仅展示房源优点，也明确呈现不满足条件和潜在取舍</div>
                  </div>
                </div>

                <div class="detail-ai-score-grid">
                  <div class="detail-score-ring" style="--score:${scoreResult.score}">
                    <div class="detail-score-value">${scoreResult.score}<small>综合匹配度</small></div>
                  </div>

                  <div class="detail-decision-list">
                    ${positive.slice(0,4).map(item => `
                      <div class="detail-decision-item good">
                        <span class="detail-decision-icon">✓</span>
                        <strong>匹配优势</strong>
                        <span>${item}</span>
                      </div>
                    `).join('')}
                    ${risks.slice(0,3).map(item => `
                      <div class="detail-decision-item warn">
                        <span class="detail-decision-icon">!</span>
                        <strong>注意事项</strong>
                        <span>${item}</span>
                      </div>
                    `).join('')}
                    ${scoreResult.missed.length ? `
                      <div class="detail-decision-item warn">
                        <span class="detail-decision-icon">!</span>
                        <strong>未满足筛选</strong>
                        <span>${scoreResult.missed.slice(0,4).join('、')}</span>
                      </div>` : ''}
                  </div>
                </div>
              </section>

              <section class="detail-section" id="detailFees">
                <div class="detail-section-head">
                  <div>
                    <div class="detail-section-title">费用详情</div>
                    <div class="detail-section-subtitle">解决竞品只突出月租、综合成本不够直观的问题</div>
                  </div>
                </div>

                <table class="detail-fee-table">
                  <thead>
                    <tr><th>费用项目</th><th>金额</th><th>收费频率</th><th>说明</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>房屋租金</td><td class="detail-fee-highlight">${displayRent(house)}</td><td>每月</td><td>页面标注租金</td></tr>
                    <tr><td>押金</td><td>${fees.known ? fees.deposit + "元" : "待咨询"}</td><td>签约时</td><td>${fees.known ? (house.leases.includes('押一付一') ? '按押一付一估算' : '按两个月租金估算') : '来源字段暂无租金'}</td></tr>
                    <tr><td>服务费</td><td>${fees.known ? fees.service + "元" : "待咨询"}</td><td>每月</td><td>${fees.known ? (fees.service ? '按月租8%进行示例估算' : '当前条件标注无服务费') : '需向平台或机构确认'}</td></tr>
                    <tr><td>中介费</td><td>${fees.known ? fees.intermediary + "元" : "待咨询"}</td><td>一次性</td><td>${fees.known ? (fees.intermediary ? '按半个月租金进行示例估算' : '当前条件标注无中介费') : '需向平台或机构确认'}</td></tr>
                    <tr><td>水电网费</td><td>${fees.known ? fees.utilities + "元" : "待咨询"}</td><td>每月估算</td><td>实际金额以账单和合同为准</td></tr>
                  </tbody>
                </table>

                <div class="detail-fee-total">
                  ${fees.known ? `预计首次支付约 <strong>${fees.firstPayment} 元</strong>；月度综合成本约 <strong>${fees.monthlyTotal} 元</strong>。` : "该房源租金字段暂无数据，首次支付和月度综合成本需向平台或机构咨询确认。"}所有费用为原型演示数据，签约前应逐项核实。
                </div>
              </section>

              <section class="detail-section" id="detailDescription">
                <div class="detail-section-head">
                  <div>
                    <div class="detail-section-title">房源描述与核验提醒</div>
                    <div class="detail-section-subtitle">减少营销化文案，使用可核查、可比较的结构化信息</div>
                  </div>
                </div>

                <div class="detail-description-grid">
                  <div class="detail-description-box">
                    <h4>房源描述</h4>
                    <p>
                      该示例房源位于${house.area}，为${titleMode}${layout}，面积约${displayArea(house)}，
                      ${house.orientation.join('/')}朝向，位于${house.floor}，${house.elevator}。
                      房屋配置包括${house.configs.slice(0,5).join('、')}，
                      适合${house.life.includes('配备书桌') ? '备考或居家办公' : titleMode === '整租' ? '重视独立空间的租客' : '预算敏感型租客'}。
                    </p>
                  </div>

                  <div class="detail-description-box">
                    <h4>现场核验清单</h4>
                    <ul>
                      <li>核对房东身份、产权信息与出租授权</li>
                      <li>确认押金、服务费、中介费及退费条件</li>
                      <li>测试水压、热水器、空调、门锁和网络</li>
                      <li>分别在白天和夜间检查采光、噪声与周边环境</li>
                      <li>将口头承诺写入正式租赁合同</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section class="detail-section" id="detailLocation">
                <div class="detail-section-head">
                  <div>
                    <div class="detail-section-title">位置与周边</div>
                    <div class="detail-section-subtitle">无API Key时使用示意地图；已加入高德/百度外部地图跳转与周边判断</div>
                  </div>
                </div>

                <div class="detail-nearby-tabs">
                  <button class="detail-nearby-tab active" type="button">地图</button>
                  <button class="detail-nearby-tab" type="button">通勤</button>
                  <button class="detail-nearby-tab" type="button">地铁</button>
                  <button class="detail-nearby-tab" type="button">公交</button>
                  <button class="detail-nearby-tab" type="button">生活</button>
                  <button class="detail-nearby-tab" type="button">核查</button>
                </div>

                ${locationTemplate(house)}
              </section>

              <section class="detail-section" id="detailSimilar">
                <div class="detail-section-head">
                  <div>
                    <div class="detail-section-title">相似房源</div>
                    <div class="detail-section-subtitle">优先推荐同区域、相近价格或相同租赁方式的示例房源</div>
                  </div>
                </div>
                <div class="detail-similar-grid">${similarTemplate(house)}</div>
              </section>
            </div>

            <aside class="detail-side-card">
              <div class="detail-advisor">
                <div class="detail-advisor-avatar">顾问</div>
                <div>
                  <strong>示例租房顾问</strong>
                  <span>平均5分钟内响应 · 原型演示</span>
                </div>
              </div>

              <div class="detail-advisor-score">
                <div><strong>9.3</strong><span>服务评分</span></div>
                <div><strong>96%</strong><span>回复率</span></div>
                <div><strong>24</strong><span>在租房源</span></div>
              </div>

              <div class="detail-side-hint">
                顾问模块借鉴58同城的服务评分，但弱化营销排名；咨询前可先查看费用、风险与AI匹配分析。
              </div>

              <div class="detail-side-actions">
                <button class="detail-side-primary" type="button" data-detail-action="contact">在线咨询</button>
                <button class="detail-side-secondary" type="button" data-detail-action="appointment">预约看房</button>
              </div>

              <div class="detail-trust-list">
                <div class="detail-trust-item"><span class="detail-trust-dot">✓</span>房源基础信息已结构化展示</div>
                <div class="detail-trust-item"><span class="detail-trust-dot">✓</span>费用项目提供示例拆分</div>
                <div class="detail-trust-item"><span class="detail-trust-dot">✓</span>同时展示优势与潜在风险</div>
                <div class="detail-trust-item"><span class="detail-trust-dot">✓</span>支持收藏、咨询与预约看房</div>
              </div>
            </aside>
          </div>
        `;

        currentDetailHouseId = house.id;
        window.scrollTo({top:0,behavior:'smooth'});
      }

      function houseHash(id){
        return `#house-${String(id).padStart(3,'0')}`;
      }

      function houseIdFromHash(){
        const match = window.location.hash.match(/^#house-(\d{1,4})$/);
        return match ? Number(match[1]) : null;
      }

      function openHouseDetail(id, updateHash = true){
        const house = getHouseById(id);
        if(!house) return;
        previousMode = aiModuleEl && !aiModuleEl.classList.contains('is-hidden') ? 'ai' : 'filter';
        filterModuleEl.classList.add('is-hidden');
        if(aiModuleEl) aiModuleEl.classList.add('is-hidden');
        detailModule.classList.remove('is-hidden');
        document.body.classList.add('detail-active');
        renderDetailPage(house);
        if(updateHash && window.location.hash !== houseHash(house.id)){
          history.pushState(null,'',houseHash(house.id));
        }
      }

      function closeHouseDetail(){
        detailModule.classList.add('is-hidden');
        document.body.classList.remove('detail-active');

        if(previousMode === 'ai' && aiModuleEl){
          aiModuleEl.classList.remove('is-hidden');
          filterModuleEl.classList.add('is-hidden');
          document.getElementById('aiModeBtn')?.classList.add('active');
          document.getElementById('filterModeBtn')?.classList.remove('active');
        }else{
          filterModuleEl.classList.remove('is-hidden');
          if(aiModuleEl) aiModuleEl.classList.add('is-hidden');
          document.getElementById('filterModeBtn')?.classList.add('active');
          document.getElementById('aiModeBtn')?.classList.remove('active');
        }
        if(/^#house-\d{1,4}$/.test(window.location.hash)){
          history.pushState(null,'',window.location.pathname + window.location.search);
        }
        window.scrollTo({top:0,behavior:'smooth'});
      }

      document.getElementById('sampleHouseGrid').addEventListener('click', event => {
        const card = event.target.closest('.sample-house-card');
        if(card) openHouseDetail(card.dataset.houseId);
      });
      document.getElementById('sampleHouseGrid').addEventListener('keydown', event => {
        if(event.key === 'Enter' || event.key === ' '){
          const card = event.target.closest('.sample-house-card');
          if(card){
            event.preventDefault();
            openHouseDetail(card.dataset.houseId);
          }
        }
      });

      detailContent.addEventListener('click', event => {
        if(event.target.closest('#detailBackBtn')){
          closeHouseDetail();
          return;
        }

        const similarCard = event.target.closest('[data-detail-house-id]');
        if(similarCard){
          const house = getHouseById(similarCard.dataset.detailHouseId);
          if(house){
            renderDetailPage(house);
            if(window.location.hash !== houseHash(house.id)){
              history.pushState(null,'',houseHash(house.id));
            }
          }
          return;
        }

        const anchor = event.target.closest('[data-detail-target]');
        if(anchor){
          const target = document.getElementById(anchor.dataset.detailTarget);
          if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
          document.querySelectorAll('.detail-anchor-btn').forEach(btn => btn.classList.toggle('active', btn === anchor));
          return;
        }

        const thumb = event.target.closest('.detail-thumb');
        if(thumb){
          document.querySelectorAll('.detail-thumb').forEach(item => item.classList.toggle('active', item === thumb));
          const main = document.getElementById('detailMainPhoto');
          const textNode = document.getElementById('detailMainPhotoText');
          if(main && textNode){
            textNode.textContent = thumb.dataset.photoState;
            const badge = main.querySelector('.detail-photo-badge');
            if(badge) badge.textContent = `${thumb.dataset.photoState} · ${thumb.dataset.galleryLabel}`;
          }
          return;
        }

        const nearbyTab = event.target.closest('.detail-nearby-tab');
        if(nearbyTab){
          document.querySelectorAll('.detail-nearby-tab').forEach(item => item.classList.toggle('active', item === nearbyTab));
          showDetailToast(`已切换至“${nearbyTab.textContent.trim()}”周边信息示意`);
          return;
        }

        const action = event.target.closest('[data-detail-action]');
        if(action){
          const type = action.dataset.detailAction;
          if(type === 'favorite'){
            action.classList.toggle('active');
            action.textContent = action.classList.contains('active') ? '♥' : '♡';
            showDetailToast(action.classList.contains('active') ? '已收藏该示例房源' : '已取消收藏');
          }else if(type === 'share'){
            showDetailToast('已生成示例分享链接');
          }else if(type === 'contact'){
            showDetailToast('在线咨询功能为原型演示，未连接真实顾问');
          }else if(type === 'appointment'){
            showDetailToast('预约看房已记录为原型交互');
          }
        }
      });

      window.addEventListener('hashchange', () => {
        const id = houseIdFromHash();
        if(id) openHouseDetail(id,false);
      });

      const initialHouseId = houseIdFromHash();
      if(initialHouseId){
        setTimeout(() => openHouseDetail(initialHouseId,false),0);
      }

      window.openHouseDetail = openHouseDetail;
    })();
