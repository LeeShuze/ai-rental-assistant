// 通用展示函数：供筛选、落地页、AI推荐和横向对比共用
;


    function displayRent(house){
      return house && house.priceText && house.priceText !== '暂无数据'
        ? house.priceText
        : '暂无数据';
    }
    function displayArea(house){
      return house && house.areaText && house.areaText !== '暂无数据'
        ? house.areaText
        : (house && house.size ? `${house.size}㎡` : '暂无数据');
    }
    function displayLayout(house){
      return (house && house.layouts && house.layouts[0]) || (house && house.layoutText) || '暂无数据';
    }
    function displayOperator(house){
      return (house && house.operator && house.operator !== '暂无数据')
        ? house.operator
        : ((house && house.brand) || '暂无数据');
    }
    function displaySubway(house){
      return house && house.subways && house.subways.length ? house.subways.join('/') : '暂无地铁';
    }
    function hasKnownPrice(house){
      return Boolean(house && Number(house.price) > 0);
    }
