
class WikiParser {
    constructor(content, targetSelector) {
        this.content = content || '';
        this.targetElement = document.querySelector(targetSelector);

        if (this.targetElement) {
            this.init();
        } else {
            console.error('WikiParser: Target element not found.');
        }
    }

    init() {
        this.render();
    }

    render() {
        const data = this.parseStructure(this.content);

        // If a Header-regions template somehow ended up inside mainContent, extract it
        if ((!data.header || !data.headerName) && data.mainContent && data.mainContent.includes('{{Header-regions')) {
            const text = data.mainContent;
            const start = text.indexOf('{{Header-regions');
            if (start !== -1) {
                // Find the balanced end of this template
                let braceDepth = 0;
                let endIndex = -1;
                for (let i = start; i < text.length - 1; i++) {
                    if (text[i] === '{' && text[i + 1] === '{') {
                        braceDepth++;
                        i++;
                        continue;
                    }
                    if (text[i] === '}' && text[i + 1] === '}') {
                        braceDepth--;
                        i++;
                        if (braceDepth === 0) {
                            endIndex = i + 1; // inclusive index of second brace
                            break;
                        }
                        continue;
                    }
                }

                if (endIndex !== -1) {
                    const fullBlock = text.slice(start, endIndex + 1);
                    try {
                        const tmpl = this.parseTemplateObject(fullBlock);
                        data.header = tmpl.args;
                        data.headerName = 'Header-regions';
                        // Remove the block from mainContent
                        data.mainContent = text.slice(0, start) + text.slice(endIndex + 1);
                    } catch (e) {
                        // If parsing fails, leave mainContent unchanged
                        console.warn('Failed to extract Header-regions from mainContent', e);
                    }
                }
            }
        }

        let html = '';

        // 1. Header
        if (data.header) {
            const h = data.header;
            // If header came from region-specific template, insert original header markup
            if (data.headerName === 'Header-regions') {
                const headerHtml = `
            <header>
                <div class="header-container">
                    <div class="box-1x1">
                        <img src="${h.icon || 'resource/placeholder.png'}" alt="Thumbnail">
                    </div>
                    <div class="header-info">
                        <h1 class="page-title">${h.title || ''}</h1>
                        <div class="subtitle">${h.id || ''}</div>
                    </div>
                </div>
                <hr class="dividers">
            </header>`;

                // Insert header into the page above the main region content
                const contentBody = document.querySelector('.content-body');
                if (contentBody) {
                    // Avoid inserting twice: check for existing header-container
                    if (!contentBody.querySelector('.header-container')) {
                        contentBody.insertAdjacentHTML('afterbegin', headerHtml);
                    }
                } else {
                    // Fallback: append to target element
                    html += headerHtml;
                }

                // Apply background to the main wrapper if provided
                if (h.background) {
                    const mw = document.querySelector('.main-wrapper');
                    if (mw) {
                        mw.style.background = `url('${h.background}') no-repeat center center fixed`;
                        mw.style.backgroundSize = 'cover';
                        mw.style.scrollBehavior = 'smooth';
                    }
                }
            } else {
                // Fallback to existing slugcat header for non-region headers
                const h2 = data.header;
                html += `
            <div class="slugcat-header">
                <img src="${h2.icon}" class="slugcat-icon">
                <div class="slugcat-title">
                    <span class="slugcat-the">THE</span><br>
                    <span class="slugcat-name">${h2.title}</span><br>
                    <span class="slugcat-id">ID: ${h2.id}</span>
                </div>
            </div>`;

                if (h2.background) {
                    this.targetElement.style.background = `url('${h2.background}') no-repeat center center fixed`;
                    this.targetElement.style.backgroundSize = 'cover';
                    this.targetElement.style.scrollBehavior = 'smooth';
                }
            }
        }

        

        // 2. Game Bars
        if (data.gamebars) {
            const g = data.gamebars;
            // Generate food pips
            let pipsHtml = '';
            const filled = parseInt(g.food_filled) || 0;
            const empty = parseInt(g.food_empty) || 0;

            for (let i = 0; i < filled; i++) pipsHtml += `<img src="resource/food_pip.png" alt="Filled pip" class="pip filled">\n`;
            pipsHtml += `<img src="resource/food_bar.png" alt="food bar" class="food-bar">\n`;
            for (let i = 0; i < empty; i++) pipsHtml += `<img src="resource/food_pip_empty.png" alt="Empty pip" class="pip empty">\n`;

            html += `
            <div class="game-bars header-bars">
                <div class="karma-overlay">
                    <img src="${g.karma_bg}" alt="karma reinforcement" class="karma-bar">
                    <img src="${g.karma_icon}" alt="karma" class="karma-icon">
                </div>
                <div class="food-display header-food">
                    <div class="food-pips" aria-label="Food pips">
                        ${pipsHtml}
                    </div>
                </div>
            </div>`;
        }

        // 3. Main Content Wrapper
        html += '<div class="slugcat-main">';

        // 4. Sidebar (Infobox + Gallery)
        // For region-specific infoboxes, render into an aside.region-details sibling to the region content.
        if (data.infobox && data.infoboxName === 'Infobox-regions') {
            const inf = data.infobox;
            const infoboxHtml = [];
            infoboxHtml.push(`<div class="region-name">${inf.Name || inf.name || ''}</div>`);
            infoboxHtml.push('<div class="region-thumbnail-rect">');
            if (inf.thumbnail) {
                infoboxHtml.push(`<img src="${inf.thumbnail}" alt="Region Thumbnail">`);
            } else {
                infoboxHtml.push('<div class="no-image-placeholder">[No image.]</div>');
            }
            infoboxHtml.push('</div>');

            // Render other detail rows (preserve original markup with detail-row/detail-label/detail-value)
            const skipKeys = new Set(['Name', 'name', 'thumbnail', 'thumbnail_url']);
            let connectionRendered = false;
            for (const [key, val] of Object.entries(inf)) {
                if (skipKeys.has(key)) continue;
                // Skip numeric positional args
                if (!isNaN(parseInt(key))) continue;

                // Special handling for Region Connections
                if (key && key.toLowerCase().includes('connection')) {
                    // Render header
                    infoboxHtml.push(`<div class="connection-header">Region Connections</div>`);
                    // Parse value: try JSON array or comma-separated
                    let connections = [];
                    try {
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed)) connections = parsed;
                    } catch (e) {
                        // Not JSON - try split by comma
                        const raw = String(val).replace(/^[\[\]"]+|[\[\]"]+$/g, '');
                        connections = raw.split(',').map(s => s.trim()).filter(Boolean);
                    }

                    // Render each connection
                    for (const conn of connections) {
                        const c = String(conn).replace(/^[\"\']+|[\"\']+$/g, '');
                        const parts = c.split(/->|→/).map(p => p.trim());
                        if (parts.length === 2) {
                            infoboxHtml.push(`
                                <div class="connection-container">
                                    <img src="resource/karma_5.png" alt="Karma" class="karma-icon-mini">
                                    <span class="connection-text">${parts[0]}</span>
                                    <span class="connection-arrow">→</span>
                                    <span class="connection-text">${parts[1]}</span>
                                </div>`);
                        } else {
                            infoboxHtml.push(`
                                <div class="connection-container">
                                    <span class="connection-text">${c}</span>
                                </div>`);
                        }
                    }
                    connectionRendered = true;
                    continue;
                }

                infoboxHtml.push(`<div class="detail-row"><div class="detail-label">${key}</div><div class="detail-value">${val}</div></div>`);
            }

            // Insert into DOM: find closest .region-main and put/update an aside.region-details inside it
            const regionMain = this.targetElement.closest('.region-main');
            if (regionMain) {
                let aside = regionMain.querySelector('.region-details');
                if (!aside) {
                    aside = document.createElement('aside');
                    aside.className = 'region-details';
                    regionMain.appendChild(aside);
                }
                aside.innerHTML = infoboxHtml.join('\n');
            } else {
                // Fallback: render into the left sidebar area inside target
                html += '<div class="slugcat-details">';
                for (const [key, val] of Object.entries(data.infobox)) {
                    if (!parseInt(key) && key !== '0') {
                        html += `\n                    <div class="detail-row">\n                        <span class="detail-label">${key}</span>\n                        <span class="detail-value">${val}</span>\n                    </div>`;
                    }
                }
                html += '</div>';
            }
        } else {
            // Default behavior for non-region infobox or gallery rendering inside the wiki block
            html += '<div class="slugcat-details">';
            if (data.infobox) {
                for (const [key, val] of Object.entries(data.infobox)) {
                    if (!parseInt(key) && key !== '0') {
                        html += `\n                    <div class="detail-row">\n                        <span class="detail-label">${key}</span>\n                        <span class="detail-value">${val}</span>\n                    </div>`;
                    }
                }
            }

            if (data.gallery) {
                html += '<h2 class="gallery-title">GALLERY</h2><div class="gallery-grid">';
                let i = 0;
                while (data.gallery[i]) {
                    const img = data.gallery[i];
                    const cap = data.gallery[i + 1] || '';
                    const parsedCap = this.parseText(cap);
                    html += `\n                 <figure class="gallery-item">\n                    <img src="${img}" alt="Gallery Image" class="gallery-img">\n                    <figcaption class="gallery-caption">${parsedCap}</figcaption>\n                </figure>`;
                    i += 2;
                }
                html += '</div>';
            }

            html += '</div>'; // End slugcat-details
        }

        // 5. Main Info Text
        html += '<div class="slugcat-info">';
        html += this.parseText(data.mainContent);
        html += '</div>'; // End slugcat-info

        html += '</div>'; // End slugcat-main

        this.targetElement.innerHTML = html;
    }

    parseStructure(text) {
        let lines = text.split('\n');
        let data = {
            header: null,
            gamebars: null,
            infobox: null,
            gallery: null,
            mainContent: ''
        };

        let buffer = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) {
                if (buffer.length > 0) buffer.push('');
                continue;
            }

            // ONE unified check for templates (single or multi-line)
            if (line.includes('{{')) {
                let fullBlock = line;
                let j = i + 1;

                // If not balanced, consume lines until it is
                if (!this.isBalanced(fullBlock)) {
                    while (j < lines.length) {
                        fullBlock += '\n' + lines[j];
                        if (this.isBalanced(fullBlock)) {
                            // Found the end
                            break;
                        }
                        j++;
                    }
                    // j is now the index of the last line consumed
                    // If we never balanced, j went to end.
                } else {
                    // It was balanced on one line
                    j = i;
                }

                // Check if this block is a Setup Template
                if (fullBlock.trim().startsWith('{{') && fullBlock.trim().endsWith('}}')) {
                    const rawName = fullBlock.slice(2).split('|')[0].split('}')[0].trim();

                    if (['Header', 'Header-regions', 'GameBars', 'Infobox', 'Infobox-regions', 'Gallery'].includes(rawName)) {
                        const tmpl = this.parseTemplateObject(fullBlock);
                        if (rawName === 'Header' || rawName === 'Header-regions') {
                            data.header = tmpl.args;
                            data.headerName = rawName;
                        }
                        if (rawName === 'GameBars') data.gamebars = tmpl.args;
                        if (rawName === 'Infobox' || rawName === 'Infobox-regions') {
                            data.infobox = tmpl.args;
                            data.infoboxName = rawName;
                        }
                        if (rawName === 'Gallery') data.gallery = tmpl.args;

                        // Advance main loop to j (last line consumed)
                        i = j;
                        continue; // Do NOT add to buffer
                    }
                }

                // If it wasn't a setup template, add to buffer
                buffer.push(fullBlock);
                i = j; // Advance
                continue;
            }

            // Not a template start line
            buffer.push(lines[i]);
        }

        data.mainContent = buffer.join('\n');
        return data;
    }

    parseTemplateObject(text) {
        const content = text.slice(2, -2);
        const parts = this.splitTemplateArgs(content);
        const name = parts[0].trim();
        const args = {};

        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            const eqIndex = part.indexOf('=');
            if (eqIndex !== -1) {
                const key = part.substring(0, eqIndex).trim();
                const val = part.substring(eqIndex + 1).trim();
                args[key] = this.parseInline(val);
            } else {
                args[i - 1] = part.trim(); // Store positional args 0-indexed for Gallery
            }
        }
        return { name, args };
    }

    // Existing parse logic renamed to parseText
    parseText(text) {
        // ... (Same logic as previous parse method) ...
        let lines = text.split('\n');
        let output = [];
        let inList = false;
        let listType = '';

        const closeList = () => {
            if (inList) {
                output.push(`</${listType}>`);
                inList = false;
                listType = '';
            }
        };

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;

            // Multi-line Template Capture (Reuse)
            if (line.includes('{{') && !this.isBalanced(line)) {
                let templateBuffer = line;
                let j = i + 1;
                while (j < lines.length) {
                    templateBuffer += '\n' + lines[j];
                    if (this.isBalanced(templateBuffer)) {
                        i = j;
                        break;
                    }
                    j++;
                }
                line = templateBuffer;
            }

            // Headers
            if (line.startsWith('==') && line.endsWith('==')) {
                closeList();
                const level = line.match(/^(=+)/)[0].length;
                const content = line.slice(level, -level).trim();
                output.push(`<h${level - 1} id="${content.replace(/\s+/g, '-').toLowerCase()}">${content}</h${level - 1}>`);
                if (level === 2) output.push('<hr class="dividers">');
                continue;
            }

            // Horizontal Rule
            if (line === '----') {
                closeList();
                output.push('<hr class="dividers">');
                continue;
            }

            // Lists
            if (line.startsWith('*')) {
                if (!inList || listType !== 'ul') {
                    closeList();
                    output.push('<ul class="DotPoint">');
                    inList = true;
                    listType = 'ul';
                }
                output.push(`<li>${this.parseInline(line.substring(1).trim())}</li>`);
                continue;
            }
            if (line.startsWith('#')) {
                if (!inList || listType !== 'ol') {
                    closeList();
                    output.push('<ol>');
                    inList = true;
                    listType = 'ol';
                }
                output.push(`<li>${this.parseInline(line.substring(1).trim())}</li>`);
                continue;
            }

            closeList();

            // Templates (Standard content templates)
            if (line.trim().startsWith('{{') && line.trim().endsWith('}}')) {
                // Skip setup templates just in case
                const rawName = line.slice(2).split('|')[0].split('}')[0].trim();
                if (['Header', 'Header-regions', 'GameBars', 'Infobox', 'Infobox-regions', 'Gallery'].includes(rawName)) continue;

                output.push(this.parseTemplate(line.trim()));
                continue;
            }

            // HTML Block check
            if (line.match(/^<\/?(div|p|table|ul|ol|li|blockquote|h[1-6]|script|style|img)/i)) {
                output.push(this.parseInline(line));
                continue;
            }

            output.push(`<p>${this.parseInline(line)}</p>`);
        }

        closeList();
        return output.join('\n');
    }

    isBalanced(text) {
        let braceDepth = 0;
        let bracketDepth = 0;

        for (let i = 0; i < text.length; i++) {
            if (text[i] === '{' && text[i + 1] === '{') {
                braceDepth++;
                i++;
            } else if (text[i] === '}' && text[i + 1] === '}') {
                braceDepth--;
                i++;
            } else if (text[i] === '[' && text[i + 1] === '[') {
                bracketDepth++;
                i++;
            } else if (text[i] === ']' && text[i + 1] === ']') {
                bracketDepth--;
                i++;
            }
            if (braceDepth < 0 || bracketDepth < 0) return false;
        }
        return braceDepth === 0 && bracketDepth === 0;
    }

    parseInline(text) {
        text = text.replace(/'''(.*?)'''/g, '<strong>$1</strong>');
        text = text.replace(/''(.*?)''/g, '<em>$1</em>');
        text = text.replace(/\[\[(.*?)\|(.*?)\]\]/g, '<a href="$1">$2</a>');
        text = text.replace(/\[\[(.*?)\]\]/g, '<a href="$1">$1</a>');
        text = text.replace(/\[(http.*?) (.*?)\]/g, '<a href="$1" target="_blank">$2</a>');
        return text;
    }

    parseTemplate(text) {
        // Reuse existing logic for Ability, Spoiler, Contents
        const content = text.slice(2, -2);
        const parts = this.splitTemplateArgs(content);
        const name = parts[0].trim();
        const args = {};

        // 1. Store RAW arguments first
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            const eqIndex = part.indexOf('=');
            if (eqIndex !== -1) {
                const key = part.substring(0, eqIndex).trim();
                const val = part.substring(eqIndex + 1).trim();
                args[key] = val; // Store RAW
            } else {
                args[i] = part.trim(); // Store RAW
            }
        }

        if (name === 'Ability') {
            return `
            <div class="${args.boxClass || 'ability-media-box'}">
                <img src="${args.image}" alt="${args.alt || 'Ability Image'}" class="${args.imgClass || 'ability-gif'}">
                <div class="${args.textClass || 'ability-context-text'}">
                    ${this.parseInline(args.text || '')}
                </div>
            </div>`;
        }

        if (name === 'Spoiler') {
            // content needs FULL parsing (headers, lists, etc.)
            const innerContent = this.parseText(args.content || '');
            return `
            <div class="spoiler-box">
                <div class="spoiler-warning-header">${this.parseInline(args.header || 'SPOILER WARNING')}</div>
                <div class="spoiler-description">${this.parseInline(args.warning || 'This section contains spoilers.')}</div>
                <button class="spoiler-toggle" onclick="toggleSpoiler(this)">[SHOW]</button>
                <div class="spoiler-content" style="display:none;">
                    ${innerContent}
                </div>
            </div>`;
        }

        if (name === 'Contents') {
            // list might contain HTML or wiki bullets, parseText handles both
            const listContent = this.parseText(args.list || '');
            return `
             <div class="contents-box">
                <div class="contents-header">
                    <h3>Contents</h3>
                    <button class="contents-toggle" onclick="toggleContents()" aria-label="Toggle contents visibility">▼</button>
                </div>
                <div class="contents-list" id="contentsList" style="display: block;">
                    ${listContent}
                </div>
            </div>`;
        }

        if (name === 'Description') {
            // Positional arg starts at index 1 in my loop above
            let descText = (args[1] || args.text || '').trim();
            return `<p class="description">${this.parseInline(descText)}</p>`;
        }
        return '';
    }

    splitTemplateArgs(content) {
        let args = [];
        let currentArg = '';
        let depth = 0;

        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            const nextChar = content[i + 1];

            if (char === '{' && nextChar === '{') {
                depth++;
                currentArg += char + nextChar;
                i++;
            } else if (char === '}' && nextChar === '}') {
                depth--;
                currentArg += char + nextChar;
                i++;
            } else if (char === '[' && nextChar === '[') {
                depth++;
                currentArg += char + nextChar;
                i++;
            } else if (char === ']' && nextChar === ']') {
                depth--;
                currentArg += char + nextChar;
                i++;
            } else if (char === '|' && depth === 0) {
                args.push(currentArg);
                currentArg = '';
            } else {
                currentArg += char;
            }
        }
        args.push(currentArg);
        return args;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof snowflakeWikiSource !== 'undefined') {
        new WikiParser(snowflakeWikiSource, '.main-wrapper');
    } else if (typeof beecatWikiSource !== 'undefined') {
        new WikiParser(beecatWikiSource, '.main-wrapper');
    } else if (typeof nightwalkerWikiSource !== 'undefined') {
        new WikiParser(nightwalkerWikiSource, '.main-wrapper');
    } else if (typeof slugcatWikiSource !== 'undefined') {
        new WikiParser(slugcatWikiSource, '.main-wrapper');
    } else if (typeof z1WikiSource !== 'undefined') {
        new WikiParser(z1WikiSource, '.wiki-block');
    }
});

function toggleContents() {
    const list = document.getElementById('contentsList');
    const button = document.querySelector('.contents-toggle');
    if (list.style.display === 'none') {
        list.style.display = 'block';
        button.textContent = '▼';
    } else {
        list.style.display = 'none';
        button.textContent = '▶';
    }
}

function toggleSpoiler(button) {
    const content = button.nextElementSibling;
    if (content.style.display === 'none') {
        content.style.display = 'block';
        button.textContent = '[HIDE]';
    } else {
        content.style.display = 'none';
        button.textContent = '[SHOW]';
    }
}