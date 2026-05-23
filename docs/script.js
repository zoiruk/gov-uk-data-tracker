// Импортируем csv как текст, парсим и строим фильтры
async function fetchData() {
    // Путь к csv (экспортируется скриптами)
    const resp = await fetch('../data/visas_flat.csv');
    const text = await resp.text();
    return Papa.parse(text, {header:true}).data;
}

// Заполнение селекторов
function fillSelectOptions(select, options) {
    select.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'All';
    select.appendChild(allOption);
    options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        select.appendChild(o);
    });
}

function filterData(data, year, quarter, type, country) {
    return data.filter(row => (
        (!year || row['Year'] == year)
        && (!quarter || row['Quarter'] == quarter)
        && (!type || row['Visa Type'] == type)
        && (!country || row['Nationality'] == country)
    ));
}

function aggregatePer(period, data, valueCol='Value') {
    // группировка по периоду (Year или Quarter), считаем сумму
    const grouped = {};
    data.forEach(row => {
        const key = row[period];
        let v = +String(row[valueCol]).replace(',','.')
        if (!isNaN(v)) grouped[key] = (grouped[key] || 0) + v;
    });
    return Object.entries(grouped).map(([k,v]) => ({period:k, value:v}));
}

// Глобальные переменные для графика и данных
let chart = null, rawData = [];

function updateTable(data) {
    const el = document.getElementById('tableContainer');
    if (!data.length) { el.innerHTML = 'Нет данных'; return; }
    let html = '<table><tr>';
    Object.keys(data[0]).forEach(key=>html+='<th>'+key+'</th>');
    html+='</tr>';
    data.forEach(row=>{
        html+='<tr>';
        Object.values(row).forEach(val=>{
            html+='<td>'+val+'</td>';
        });
        html+='</tr>';
    });
    html+='</table>';
    el.innerHTML = html;
}

function updateChart(period, data) {
    const ctx = document.getElementById('statsChart').getContext('2d');
    const agg = aggregatePer(period, data);
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type:'bar',
        data:{
            labels: agg.map(x=>x.period),
            datasets:[{
                label:'Виз выдано',
                data: agg.map(x=>x.value),
                backgroundColor:'#1698F8'
            }]
        },
        options:{
            responsive:true,
            plugins:{legend:{display:false}}
        }
    });
}

window.addEventListener('DOMContentLoaded', async ()=>{
    // Загружаем и парсим данные
    rawData = await fetchData();
    // Заполняем фильтры
    const years = [...new Set(rawData.map(x=>x['Year']).filter(Boolean))].sort();
    const quarters = [...new Set(rawData.map(x=>x['Quarter']).filter(Boolean))].sort();
    const types = [...new Set(rawData.map(x=>x['Visa Type']).filter(Boolean))].sort();
    const countries = [...new Set(rawData.map(x=>x['Nationality']).filter(Boolean))].sort();
    fillSelectOptions(document.getElementById('yearSelect'), years);
    fillSelectOptions(document.getElementById('quarterSelect'), quarters);
    fillSelectOptions(document.getElementById('typeSelect'), types);
    fillSelectOptions(document.getElementById('countrySelect'), countries);

    // Фильтрация и построение графика по умолчанию
    let lastYear = years[years.length-1];
    document.getElementById('yearSelect').value = lastYear;
    let filtered = filterData(rawData, lastYear, '', '', '');
    updateChart('Quarter', filtered);
    updateTable(filtered);

    // Обработчики для фильтров
    document.getElementById('yearSelect').onchange = function() {
        let yr = this.value;
        let qt = document.getElementById('quarterSelect').value;
        let tp = document.getElementById('typeSelect').value;
        let nat = document.getElementById('countrySelect').value;
        let res = filterData(rawData, yr, qt, tp, nat);
        updateChart(qt ? 'Quarter':'Year', res);
        updateTable(res);
    };
    document.getElementById('quarterSelect').onchange = document.getElementById('yearSelect').onchange;
    document.getElementById('typeSelect').onchange = document.getElementById('yearSelect').onchange;
    document.getElementById('countrySelect').onchange = document.getElementById('yearSelect').onchange;

    // Подключаем папапарсер js для csv
    if (!(window.Papa && window.Papa.parse)) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/papaparse@5.3.2/papaparse.min.js';
      document.body.appendChild(s);
    }
})
