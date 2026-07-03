'use strict';

// ────────── Public API ──────────────────────────────────────────────────

export function buildSlides(slideTrack, slides) {
    slideTrack.innerHTML = '';
    slides.forEach((data, i) => {
        const { card, body } = buildSlide(data, i);
        if (data.body && typeof data.body === 'object') {
            renderBody(data.body, body);
        }
        slideTrack.appendChild(card);
    });
    syncActive(0, slideTrack);
}

export function slideTo(pos, slideTrack, transition = false) {
    slideTrack.style.transition = transition ? 'transform 0.3s cubic-bezier(0.65, 0, 0.35, 1)' : 'none';
    slideTrack.style.transform = `translateX(${(-pos * 100)}vw)`;
}

export function snapTo(index, { slides, slideTrack, current, clearCanvas, syncFooter }, animate = true) {
    index = Math.min(Math.max(index, 0), slides.length - 1);
    const pre = current;
    if (pre !== index) clearCanvas();
    slideTo(index, slideTrack, animate);
    syncFooter(index);
    syncActive(index, slideTrack);
    return index;
}

export function syncActive(index, slideTrack) {
    slideTrack.querySelectorAll('.slide').forEach((slide, i) => {
        slide.classList.toggle('live-page', i === index);
    });
}

// ────────── Unit Builders ──────────────────────────────────────────────────

function animateSliding(fromIndex, toIndex, slideTrack) {
    const allBodies = slideTrack.querySelectorAll('.slide > .slide-body');
    const [from, to] = [allBodies[fromIndex], allBodies[toIndex]];
    if (from) from.classList.add('anim-out');
    if (to) to.classList.add('anim-in');
    setTimeout(() => { from?.classList.remove('anim-out'); to?.classList.remove('anim-in'); }, 300);
}

function buildSlide(slideData, index) {
    const card = document.createElement('div');
    card.className = 'slide';
    card.setAttribute('data-index', index);

    const header = document.createElement('div');
    header.className = 'slide-header';

    if (slideData.title) {
        const h1 = document.createElement('h1');
        h1.className = 'title';
        h1.textContent = slideData.title;
        header.appendChild(h1);
    }
    if (slideData.subtitle) {
        const h2 = document.createElement('h2');
        h2.className = 'subtitle';
        h2.textContent = slideData.subtitle;
        header.appendChild(h2);
    }

    card.appendChild(header);

    const body = document.createElement('div');
    body.className = 'slide-body';
    card.appendChild(body);

    const footer = document.createElement('footer');
    footer.className = 'slide-footer';

    const pageNum = document.createElement('span');
    pageNum.className = 'slide-page';
    pageNum.textContent = index + 1;

    footer.appendChild(pageNum);
    card.appendChild(footer);

    return { card, body };
}

function renderBody(body, container) {
    if (body?.type) {
        const cell = document.createElement('div');
        cell.className = 'content-cell';
        renderItem(body, cell);
        container.appendChild(cell);
        return;
    }
}

function renderItem(item, cell) {
    switch (item.type) {
        case 'text':    renderText(item,  cell); break;
        case 'break':   renderBreak(item, cell); break;
        case 'members': renderMembers(item, cell); break;
        case 'index':   renderIndex(item, cell); break;
        case 'image':   renderImage(item, cell); break;
        case 'video':   renderVideo(item, cell); break;
        case 'stats':   renderStats(item, cell); break;
        
        case 'grid':  renderGrid(item, cell);  break;
        case 'stack': renderStack(item, cell); break;

        case 'pie':   renderPie(item, cell);   break;
        case 'bar':   renderBar(item, cell);   break;

        case 'custom': renderCustom(item, cell); break;

        // case 'hist':  renderHist(item, cell);  break;
        // case 'plot':  renderPlot(item, cell);  break;
        default: return;
    }
}

// ────────── Item Types ──────────────────────────────────────────────────

async function renderCustom(item, cell) {
    const file = item.data;
    const func = item.metadata;
    if (!file || !func) return;

    try {
        const mod = await import(file);
        const fn = mod[func];
        if (typeof fn === 'function') fn(cell);
    } catch (e) {
        console.error(`[custom] Failed To Load '${file}' OR Call '${func}':`, e);
    }
}

function renderBreak(item, cell) {
    const div = document.createElement('div');
    div.className = 'title break-title';
    div.textContent = item.data || '';
    cell.appendChild(div);

    if (item.metadata) {
        const meta = document.createElement('div');
        meta.className = 'subtitle break-subtitle';
        meta.textContent = item.metadata;
        cell.appendChild(meta);
    }

    cell.classList.add('content-cell--break');
}

function renderMembers(item, cell) {
    const entries = Array.isArray(item.data) ? item.data : [];
    if (!entries.length) return;

    const wrap = document.createElement('div');
    wrap.className = 'content-members-wrap';

    const track = document.createElement('div');
    track.className = 'content-members-track';

    [...entries, ...entries].forEach(entry => {
        const card = document.createElement('div');
        card.className = 'content-member-card';

        if (entry.link) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => window.open(entry.link, '_blank'));
        }

        const img = document.createElement('div');
        img.className = 'content-member-avatar';
        if (entry.image) img.style.backgroundImage = `url('${entry.image}')`;

        const titleEl = document.createElement('div');
        titleEl.className = 'title member-title';
        titleEl.innerHTML = window.marked.parse(entry.title || '').replace(/^<p>|<\/p>\n?$/g, '');

        const subtitleEl = document.createElement('div');
        subtitleEl.className = 'subtitle member-subtitle';
        if (entry.subtitle) subtitleEl.innerHTML = window.marked.parse(entry.subtitle || '').replace(/^<p>|<\/p>\n?$/g, '');

        card.appendChild(img);
        card.appendChild(titleEl);
        card.appendChild(subtitleEl);
        track.appendChild(card);
    });

    wrap.appendChild(track);
    cell.appendChild(wrap);

    cell.classList.add('content-cell--members');
}

function renderIndex(item, cell) {
    const entries = Array.isArray(item.data) ? item.data : [];
    if (!entries.length) return;

    const grid = document.createElement('div');
    grid.className = 'content-index-grid';

    entries.forEach(entry => {
        const row = document.createElement('div');
        row.className = 'content-index-item';

        if (Number.isInteger(entry.page)) row.dataset.page = String(entry.page - 1);
        else if (entry.page) {
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => window.open(entry.page, '_blank'));
        }

        const body = document.createElement('div');
        body.className = 'content-index-body';

        const titleEl = document.createElement('div');
        titleEl.className = 'title index-title';
        titleEl.innerHTML = window.marked.parse(entry.title || '').replace(/^<p>|<\/p>\n?$/g, '');
        body.appendChild(titleEl);

        if (entry.subtitle) {
            const subtitleEl = document.createElement('div');
            subtitleEl.className = 'subtitle index-subtitle';
            subtitleEl.innerHTML = window.marked.parse(entry.subtitle || '').replace(/^<p>|<\/p>\n?$/g, '');
            body.appendChild(subtitleEl);
        }

        row.appendChild(body);

        const pageEl = document.createElement('div');
        pageEl.className = 'subtitle index-subtitle';
        pageEl.textContent = entry.page;
        row.appendChild(pageEl);

        grid.appendChild(row);
    });

    cell.appendChild(grid);
    cell.classList.add('content-cell--index');
}

function renderText(item, cell) {
    const div = document.createElement('div');
    div.className = 'content-text';
    div.innerHTML = window.marked.parse(Array.isArray(item.data) ? item.data.join('\n\n') : String(item.data || ''));
    cell.appendChild(div);
}

function renderImage(item, cell) {
    const wrap = document.createElement('figure');
    wrap.className = 'content-media';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'content-media-img-wrap';

    const img = document.createElement('img');
    img.src = item.data || '';
    img.alt = item.metadata || '';
    img.className = 'content-media-cell';
    if (item.fade === false) img.classList.add('no-fade');

    imgWrap.appendChild(img);
    wrap.appendChild(imgWrap);

    if (item.metadata) {
        const cap = document.createElement('figcaption');
        cap.className = 'content-media-caption';
        cap.textContent = item.metadata;
        wrap.appendChild(cap);
    }

    cell.appendChild(wrap);
}

function renderVideo(item, cell) {
    const wrap = document.createElement('figure');
    wrap.className = 'content-media';

    const vid = document.createElement('video');
    vid.src = item.data || '';
    vid.className = 'content-media-cell';
    vid.controls = true;
    vid.playsInline = true;
    wrap.appendChild(vid);

    if (item.metadata) {
        const cap = document.createElement('figcaption');
        cap.className = 'content-media-caption';
        cap.textContent = item.metadata;
        wrap.appendChild(cap);
    }

    cell.appendChild(wrap);
}

function renderStats(item, cell) {
    const wrap = document.createElement('div');
    wrap.className = 'content-stats';

    const rows = Array.isArray(item.data) ? item.data : [item.data];

    wrap.style.gridTemplateRows = `repeat(${rows.length}, 1fr)`;

    rows.forEach(row => {
        const entries = Object.entries(row);
        const rowEl = document.createElement('div');
        rowEl.className = 'content-stats-row';
        rowEl.style.gridTemplateColumns = `repeat(${entries.length}, 1fr)`;

        entries.forEach(([label, value]) => {
            const card = document.createElement('div');
            card.className = 'content-stats-card';

            const val = document.createElement('div');
            val.className = 'content-stats-value';
            val.textContent = value;

            const lbl = document.createElement('div');
            lbl.className = 'content-stats-label';
            lbl.textContent = label;

            card.appendChild(val);
            card.appendChild(lbl);
            rowEl.appendChild(card);
        });

        wrap.appendChild(rowEl);
    });

    cell.appendChild(wrap);
}

function renderStack(item, cell) {
    const pages = Array.isArray(item.data) ? item.data : [];
    if (!pages.length) return;

    let current = 0;

    const wrap = document.createElement('div');
    wrap.className = 'content-stack';

    const nav = document.createElement('div');
    nav.className = 'content-stack-nav';

    const btnBack = document.createElement('button');
    btnBack.className = 'meta-btn';
    btnBack.innerHTML = `<svg viewBox='0 0 24 24' fill='currentColor'><path d='M15 18l-6-6 6-6'/></svg>`;

    const idxLabel = document.createElement('span');
    idxLabel.className = 'meta-label';

    const title = document.createElement('span');
    title.className = 'content-stack-title';
    title.textContent = item.metadata || '';

    const btnNext = document.createElement('button');
    btnNext.className = 'meta-btn';
    btnNext.innerHTML = `<svg viewBox='0 0 24 24' fill='currentColor'><path d='M9 18l6-6-6-6'/></svg>`;

    nav.appendChild(title);
    nav.appendChild(btnBack);
    nav.appendChild(idxLabel);
    nav.appendChild(btnNext);

    const viewport = document.createElement('div');
    viewport.className = 'content-stack-viewport';

    const track = document.createElement('div');
    track.className = 'content-stack-track';
    viewport.appendChild(track);

    pages.forEach(bodyDef => {
        const page = document.createElement('div');
        page.className = 'content-stack-page';
        renderBody(bodyDef, page);
        track.appendChild(page);
    });

    function sync(animate) {
        track.style.transition = animate ? 'transform 0.3s cubic-bezier(0.65, 0, 0.35, 1)' : 'none';
        track.style.transform = `translateX(${-current * 100}%)`;
        idxLabel.textContent = `${current + 1}/${pages.length}`;
        btnBack.disabled = current === 0;
        btnNext.disabled = current === pages.length - 1;
    }

    btnBack.addEventListener('click', () => { if (current > 0) { current--; sync(true); } });
    btnNext.addEventListener('click', () => { if (current < pages.length - 1) { current++; sync(true); } });

    wrap.appendChild(nav);
    wrap.appendChild(viewport);
    cell.appendChild(wrap);

    sync(false);
}

function renderGrid(item, cell) {
    const pages = Array.isArray(item.data) ? item.data : [];
    const meta = item.metadata || {};
    const rows = Array.isArray(meta.rows) ? meta.rows : [1];
    const cols = Array.isArray(meta.cols) ? meta.cols : [1];

    const grid = document.createElement('div');
    grid.className = 'content-grid-grid';
    grid.style.gridTemplateRows = rows.map(w => w === 0 ? 'auto' : `${w}fr`).join(' ');
    grid.style.gridTemplateColumns = cols.map(w => w === 0 ? 'auto' : `${w}fr`).join(' ');

    pages.forEach(entry => {
        const [r = 0, c = 0, rs = 1, cs = 1] = Array.isArray(entry.index) ? entry.index : [0, 0, 1, 1];
        const gridCell = document.createElement('div');
        gridCell.className = 'content-grid-cell';
        gridCell.style.gridRow = `${r + 1} / span ${rs}`;
        gridCell.style.gridColumn = `${c + 1} / span ${cs}`;
        renderItem(entry, gridCell);
        grid.appendChild(gridCell);
    });

    cell.appendChild(grid);
    cell.classList.add('content-cell--grid');
}

function renderPie(item, cell) {
    const data = item.data || {};
    const entries = Object.entries(data);
    if (!entries.length) return;

    const wrap = document.createElement('div');
    wrap.className = 'content-pie';

    const canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
    cell.appendChild(wrap);

    const defaults = ['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.15)'];

    new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: entries.map(([k]) => k),
            datasets: [{
                data: entries.map(([, v]) => v.value),
                backgroundColor: entries.map(([, v], i) => v.color || defaults[i % defaults.length]),
                borderColor: 'transparent',
                hoverOffset: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.75)',
                        font: { size: 11 },
                        boxWidth: 10,
                        boxHeight: 10,
                        borderRadius: 99,
                        useBorderRadius: true,
                        padding: 12,
                    }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.toFixed(1)}%`
                    }
                }
            }
        }
    });
}

function renderBar(item, cell) {
    const data = item.data || {};
    const entries = Object.entries(data);
    if (!entries.length) return;

    const wrap = document.createElement('div');
    wrap.className = 'content-bar';

    const canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
    cell.appendChild(wrap);

    const defaults = ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.25)'];

    const isMulti = Array.isArray(entries[0][1]);

    if (isMulti) {
        const labels = entries[0][1].map(o => o.label);
        const datasets = entries.map(([name, arr]) => ({
            label: name,
            data: arr.map(o => o.value),
            backgroundColor: arr.map(o => o.color),
            borderRadius: 4,
            borderSkipped: false,
        }));

        new Chart(canvas, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true, labels: { color: 'rgba(255,255,255,0.75)' } },
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}` } }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { color: 'rgba(255,255,255,0.75)', font: { size: 11 } },
                        border: { display: false },
                    },
                    y: {
                        stacked: true,
                        grid: { color: 'rgba(255,255,255,0.08)' },
                        ticks: {
                            color: 'rgba(255,255,255,0.5)',
                            font: { size: 10 },
                            callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v
                        },
                        border: { display: false },
                    }
                }
            }
        });
        return;
    }

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: entries.map(([k]) => k),
            datasets: [{
                data: entries.map(([, v]) => v.value),
                backgroundColor: entries.map(([, v], i) => v.color || defaults[i % defaults.length]),
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ctx.parsed.y.toLocaleString() } }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255, 255, 255, 0.75)', font: { size: 11 } },
                    border: { display: false },
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.08)' },
                    ticks: {
                        color: 'rgba(255,255,255,0.5)',
                        font: { size: 10 },
                        callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v
                    },
                    border: { display: false },
                }
            }
        }
    });
}