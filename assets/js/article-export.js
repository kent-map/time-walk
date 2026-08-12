(function () {
  'use strict';

  const EXPORT_SELECTOR = '[data-article-export]';
  const PDF_QUERY_KEY = 'article-export';
  const PDF_QUERY_VALUE = 'pdf';
  const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const EMU_PER_INCH = 914400;
  const MAX_IMAGE_WIDTH_EMU = Math.round(6.25 * EMU_PER_INCH);
  const MAX_IMAGE_HEIGHT_EMU = Math.round(7.25 * EMU_PER_INCH);

  function escapeXml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function slugify(value) {
    return String(value || 'article')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'article';
  }

  function absoluteUrl(value) {
    if (!value) return '';
    try {
      return new URL(value, window.location.href).href;
    } catch (_error) {
      return value;
    }
  }

  function exportImageUrl(value) {
    const resolved = absoluteUrl(value);
    try {
      const url = new URL(resolved);
      const marker = '/wikipedia/commons/thumb/';
      if (url.hostname === 'upload.wikimedia.org' && url.pathname.includes(marker)) {
        const [prefix, remainder] = url.pathname.split(marker);
        const parts = remainder.split('/');
        if (parts.length >= 4) {
          parts.pop();
          url.pathname = `${prefix}/wikipedia/commons/${parts.join('/')}`;
          return url.href;
        }
      }
    } catch (_error) {
      // Keep the resolved URL when it is not a standard Wikimedia thumbnail.
    }
    return resolved;
  }

  function exportLinkUrl(value, sourceUrl) {
    if (!value || value.startsWith('#')) return value;
    try {
      return new URL(value, sourceUrl || window.location.href).href;
    } catch (_error) {
      return value;
    }
  }

  function configFromRoot(root) {
    return {
      root,
      title: root.dataset.title || document.title,
      description: root.dataset.description || '',
      author: root.dataset.author || '',
      published: root.dataset.published || '',
      siteTitle: root.dataset.siteTitle || 'Time Walk',
      sourceUrl: root.dataset.sourceUrl || window.location.href,
      heroImage: root.dataset.heroImage || '',
      heroCaption: root.dataset.heroCaption || '',
      jszipUrl: root.dataset.jszipUrl,
      jszipIntegrity: root.dataset.jszipIntegrity
    };
  }

  function setStatus(root, message) {
    const status = root.querySelector('.article-download__status');
    if (status) status.textContent = message;
  }

  function showToast(message, timeout = 2800) {
    document.querySelectorAll('.article-export-toast').forEach((node) => node.remove());
    const toast = document.createElement('div');
    toast.className = 'article-export-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), timeout);
  }

  function setBusy(root, busy, message = '') {
    root.classList.toggle('is-busy', busy);
    root.querySelectorAll('button').forEach((button) => {
      button.disabled = busy;
    });
    if (message) setStatus(root, message);
  }

  function closeMenu(root, returnFocus = false) {
    const trigger = root.querySelector('.article-download__trigger');
    const menu = root.querySelector('.article-download__menu');
    if (!trigger || !menu) return;
    trigger.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    if (returnFocus) trigger.focus();
  }

  function closeOtherMenus(currentRoot) {
    document.querySelectorAll(EXPORT_SELECTOR).forEach((root) => {
      if (root !== currentRoot) closeMenu(root);
    });
  }

  function toggleMenu(root) {
    const trigger = root.querySelector('.article-download__trigger');
    const menu = root.querySelector('.article-download__menu');
    if (!trigger || !menu) return;
    const opening = menu.hidden;
    closeOtherMenus(root);
    menu.hidden = !opening;
    trigger.setAttribute('aria-expanded', String(opening));
    if (opening) menu.querySelector('[role="menuitem"]')?.focus();
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function mediaCaption(url, fallback = '') {
    const caption = url.searchParams.get('caption') || fallback;
    const attribution = url.searchParams.get('attribution');
    return [caption, attribution].filter(Boolean).join(' - ');
  }

  function createFigure(imageUrl, caption, alt = '') {
    const figure = createElement('figure', 'article-export-figure');
    if (imageUrl) {
      const image = document.createElement('img');
      image.src = exportImageUrl(imageUrl);
      image.alt = alt || caption || '';
      image.loading = 'eager';
      figure.appendChild(image);
    }
    if (caption) figure.appendChild(createElement('figcaption', '', caption));
    return figure;
  }

  function createMediaNote(label, href, caption) {
    const note = createElement('aside', 'article-export-media-note');
    const strong = createElement('strong', '', `${label}: `);
    note.appendChild(strong);
    if (href) {
      const link = createElement('a', '', caption || 'Open media');
      link.href = absoluteUrl(href);
      note.appendChild(link);
    } else {
      note.appendChild(document.createTextNode(caption || 'Interactive media is available in the online article.'));
    }
    return note;
  }

  function replacementForIframe(frame, config) {
    const url = new URL(frame.getAttribute('src') || '', window.location.href);
    const className = frame.className || '';
    const closestCaption = frame.closest('figure')?.querySelector('figcaption')?.textContent?.trim() || '';

    if (className.includes('embed-image-compare')) {
      const wrapper = createElement('figure', 'article-export-comparison');
      const before = url.searchParams.get('before');
      const after = url.searchParams.get('after');
      if (before) wrapper.appendChild(createFigure(before, 'Before'));
      if (after) wrapper.appendChild(createFigure(after, 'After'));
      const caption = mediaCaption(url, closestCaption);
      if (caption) {
        const figcaption = createElement('figcaption', '', caption);
        figcaption.style.gridColumn = '1 / -1';
        wrapper.appendChild(figcaption);
      }
      return wrapper;
    }

    if (className.includes('embed-image')) {
      const src = url.searchParams.get('src');
      const caption = mediaCaption(url, closestCaption);
      if (src) return createFigure(src, caption, caption);
      return createMediaNote('Image', url.href, caption || 'View the image online');
    }

    if (className.includes('embed-youtube')) {
      const videoId = url.searchParams.get('vid');
      const caption = mediaCaption(url, closestCaption) || 'Watch the video';
      const youtubeUrl = videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : url.href;
      return createMediaNote('Video', youtubeUrl, caption);
    }

    if (className.includes('embed-map')) {
      return createMediaNote('Interactive map', config?.sourceUrl || window.location.href, mediaCaption(url, closestCaption));
    }

    if (className.includes('embed-iframe')) {
      return createMediaNote('Embedded resource', url.href, closestCaption || 'Open the embedded resource');
    }

    if (className.includes('embed-vis') || className.includes('network')) {
      return createMediaNote('Interactive network', config?.sourceUrl || window.location.href, mediaCaption(url, closestCaption));
    }

    return createMediaNote('Interactive media', url.href, closestCaption);
  }

  function unwrapElement(element) {
    const parent = element.parentNode;
    if (!parent) return;
    while (element.firstChild) parent.insertBefore(element.firstChild, element);
    element.remove();
  }

  function cleanArticleContent(config = {}) {
    const source = document.querySelector('article .post-content');
    if (!source) throw new Error('Article content was not found.');
    const clone = source.cloneNode(true);

    clone.querySelectorAll('iframe').forEach((frame) => frame.replaceWith(replacementForIframe(frame, config)));
    clone.querySelectorAll('script, style, noscript, dialog, button, .anchor, .yt-print-poster').forEach((node) => node.remove());
    clone.querySelectorAll('sl-tab, sl-carousel-item[aria-hidden="true"]').forEach((node) => node.remove());
    clone.querySelectorAll('sl-tab-group, sl-tab-panel, sl-carousel, .table-wrapper, .float-pair').forEach(unwrapElement);
    clone.querySelectorAll('[hidden]').forEach((node) => node.removeAttribute('hidden'));

    clone.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('#')) link.href = exportLinkUrl(href, config.sourceUrl);
      link.removeAttribute('target');
      link.removeAttribute('rel');
    });

    clone.querySelectorAll('img').forEach((image) => {
      const src = image.dataset.src || image.getAttribute('src') || image.currentSrc;
      if (src) image.src = exportImageUrl(src);
      image.removeAttribute('srcset');
      image.removeAttribute('sizes');
      image.removeAttribute('loading');
      image.removeAttribute('width');
      image.removeAttribute('height');
    });

    clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    clone.querySelectorAll('[style]').forEach((node) => {
      if (!node.classList.contains('article-export-comparison')) node.removeAttribute('style');
    });
    clone.querySelectorAll('[class]').forEach((node) => {
      const keep = [...node.classList].filter((name) => name.startsWith('article-export-'));
      if (keep.length) node.className = keep.join(' ');
      else node.removeAttribute('class');
    });

    return clone;
  }

  function findHeroFigure(config) {
    if (config?.heroImage) {
      const configured = createFigure(config.heroImage, config.heroCaption, config.heroCaption);
      configured.className = 'article-export-sheet__hero article-export-figure';
      return configured;
    }
    const sourceImage = document.querySelector('article > header img.preview-img');
    if (!sourceImage) return null;
    const src = sourceImage.dataset.src || sourceImage.currentSrc || sourceImage.getAttribute('src');
    if (!src) return null;
    const caption = sourceImage.closest('figure, .mt-3')?.querySelector('figcaption')?.textContent?.trim() || sourceImage.alt || '';
    const figure = createFigure(src, caption, sourceImage.alt || caption);
    figure.className = 'article-export-sheet__hero article-export-figure';
    return figure;
  }

  function buildPrintSheet(config) {
    const sheet = createElement('main', 'article-export-sheet');
    sheet.setAttribute('aria-label', `Printable version of ${config.title}`);

    const actions = createElement('div', 'article-export-sheet__actions');
    const printButton = createElement('button', '', 'Print / Save as PDF');
    printButton.type = 'button';
    printButton.addEventListener('click', () => window.print());
    actions.appendChild(printButton);
    sheet.appendChild(actions);

    sheet.appendChild(createElement('p', 'article-export-sheet__brand', config.siteTitle));
    const header = createElement('header', 'article-export-sheet__header');
    header.appendChild(createElement('h1', 'article-export-sheet__title', config.title));
    if (config.description) header.appendChild(createElement('p', 'article-export-sheet__description', config.description));
    const meta = [config.author ? `By ${config.author}` : '', config.published ? `Published ${config.published}` : '']
      .filter(Boolean).join(' | ');
    if (meta) header.appendChild(createElement('p', 'article-export-sheet__meta', meta));
    const hero = findHeroFigure(config);
    if (hero) header.appendChild(hero);
    sheet.appendChild(header);

    const content = cleanArticleContent(config);
    content.className = 'article-export-sheet__content';
    sheet.appendChild(content);

    const source = createElement('p', 'article-export-sheet__source');
    source.appendChild(document.createTextNode('Online article: '));
    const link = createElement('a', '', config.sourceUrl);
    link.href = config.sourceUrl;
    source.appendChild(link);
    sheet.appendChild(source);
    return sheet;
  }

  function waitForImages(root, timeout = 10000) {
    const pending = [...root.querySelectorAll('img')]
      .filter((image) => !image.complete)
      .map((image) => new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      }));
    if (!pending.length) return Promise.resolve();
    return Promise.race([
      Promise.all(pending),
      new Promise((resolve) => window.setTimeout(resolve, timeout))
    ]);
  }

  async function activatePdfMode(options = {}) {
    const root = document.querySelector(EXPORT_SELECTOR);
    if (!root || document.querySelector('.article-export-sheet')) return;
    const config = configFromRoot(root);
    const sheet = buildPrintSheet(config);
    document.body.appendChild(sheet);
    document.documentElement.classList.add('article-export-mode');
    document.title = `${config.title} - PDF`;
    await waitForImages(sheet);
    if (options.autoPrint !== false) window.setTimeout(() => window.print(), 350);
  }

  function openPdf(config) {
    const url = new URL(window.location.href);
    url.searchParams.set(PDF_QUERY_KEY, PDF_QUERY_VALUE);
    url.hash = '';
    window.open(url.href, '_blank', 'noopener');
    setStatus(config.root, 'Opened a print-ready PDF view.');
    closeMenu(config.root);
  }

  function ensureJsZip(config) {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (window.__timeWalkJsZipPromise) return window.__timeWalkJsZipPromise;

    window.__timeWalkJsZipPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = config.jszipUrl;
      script.async = true;
      script.crossOrigin = 'anonymous';
      if (config.jszipIntegrity) script.integrity = config.jszipIntegrity;
      script.addEventListener('load', () => {
        if (window.JSZip) resolve(window.JSZip);
        else reject(new Error('The Word export library did not initialise.'));
      }, { once: true });
      script.addEventListener('error', () => reject(new Error('The Word export library could not be loaded.')), { once: true });
      document.head.appendChild(script);
    });
    return window.__timeWalkJsZipPromise;
  }

  function imageExtension(type) {
    if (type === 'image/png') return { extension: 'png', contentType: 'image/png' };
    if (type === 'image/gif') return { extension: 'gif', contentType: 'image/gif' };
    if (type === 'image/jpeg' || type === 'image/jpg') return { extension: 'jpg', contentType: 'image/jpeg' };
    return null;
  }

  async function imageDimensions(blob) {
    if ('createImageBitmap' in window) {
      const bitmap = await createImageBitmap(blob);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image dimensions could not be read.'));
      };
      image.src = url;
    });
  }

  async function convertImageToPng(blob) {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    bitmap.close();
    return new Promise((resolve, reject) => {
      canvas.toBlob((png) => png ? resolve(png) : reject(new Error('Image conversion failed.')), 'image/png');
    });
  }

  async function optimiseImageBlob(blob) {
    const originalType = imageExtension(blob.type);
    const dimensions = await imageDimensions(blob);
    const maxPixels = 1600;
    const scale = Math.min(1, maxPixels / Math.max(dimensions.width, dimensions.height));
    if (originalType && scale === 1) {
      return { blob, imageType: originalType, dimensions };
    }

    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(dimensions.width * scale));
    canvas.height = Math.max(1, Math.round(dimensions.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const outputMime = originalType?.extension === 'jpg' ? 'image/jpeg' : 'image/png';
    const output = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error('Image optimisation failed.')),
        outputMime,
        outputMime === 'image/jpeg' ? 0.88 : undefined
      );
    });
    return {
      blob: output,
      imageType: imageExtension(outputMime),
      dimensions: { width: canvas.width, height: canvas.height }
    };
  }

  function imageSizeInEmu(width, height) {
    const safeWidth = Math.max(1, width || 1200);
    const safeHeight = Math.max(1, height || 800);
    const widthScale = MAX_IMAGE_WIDTH_EMU / safeWidth;
    const heightScale = MAX_IMAGE_HEIGHT_EMU / safeHeight;
    const scale = Math.min(widthScale, heightScale);
    return {
      width: Math.round(safeWidth * scale),
      height: Math.round(safeHeight * scale)
    };
  }

  async function prepareImages(container, state) {
    const byUrl = new Map();
    const images = [...container.querySelectorAll('img')];
    await Promise.all(images.map(async (image) => {
      const src = exportImageUrl(image.getAttribute('src'));
      if (!src) return;
      if (byUrl.has(src)) {
        state.imageElements.set(image, await byUrl.get(src));
        return;
      }

      const task = (async () => {
        try {
          const response = await fetch(src, { mode: 'cors', credentials: 'omit' });
          if (!response.ok) throw new Error(`Image request returned ${response.status}.`);
          const originalBlob = await response.blob();
          const optimized = await optimiseImageBlob(originalBlob);
          const blob = optimized.blob;
          const imageType = optimized.imageType;
          const dimensions = optimized.dimensions;
          const size = imageSizeInEmu(dimensions.width, dimensions.height);
          const number = state.nextImageNumber++;
          const path = `word/media/image${number}.${imageType.extension}`;
          state.zip.file(path, await blob.arrayBuffer());
          state.imageTypes.set(imageType.extension, imageType.contentType);
          const relationshipId = state.addRelationship(
            'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
            `media/image${number}.${imageType.extension}`
          );
          return { relationshipId, size, number, alt: image.alt || 'Article image' };
        } catch (error) {
          console.warn(`Article export skipped image ${src}`, error);
          return null;
        }
      })();

      byUrl.set(src, task);
      state.imageElements.set(image, await task);
    }));
  }

  function runProperties(format = {}) {
    const properties = [];
    if (format.bold) properties.push('<w:b/>');
    if (format.italic) properties.push('<w:i/>');
    if (format.underline) properties.push('<w:u w:val="single"/>');
    if (format.strike) properties.push('<w:strike/>');
    if (format.superscript) properties.push('<w:vertAlign w:val="superscript"/>');
    if (format.subscript) properties.push('<w:vertAlign w:val="subscript"/>');
    if (format.code) {
      properties.push('<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>');
      properties.push('<w:sz w:val="19"/><w:szCs w:val="19"/>');
      properties.push('<w:shd w:val="clear" w:fill="EEF2F6"/>');
    }
    if (format.color) properties.push(`<w:color w:val="${format.color}"/>`);
    return properties.length ? `<w:rPr>${properties.join('')}</w:rPr>` : '';
  }

  function textRun(text, format = {}) {
    if (!text) return '';
    const normalized = String(text).replace(/\s+/g, ' ');
    if (!normalized) return '';
    return `<w:r>${runProperties(format)}<w:t xml:space="preserve">${escapeXml(normalized)}</w:t></w:r>`;
  }

  function inlineXml(node, state, format = {}) {
    if (node.nodeType === Node.TEXT_NODE) return textRun(node.nodeValue, format);
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName.toLowerCase();
    if (tag === 'br') return `<w:r>${runProperties(format)}<w:br/></w:r>`;
    if (tag === 'img') return '';

    const next = { ...format };
    if (tag === 'strong' || tag === 'b') next.bold = true;
    if (tag === 'em' || tag === 'i') next.italic = true;
    if (tag === 'u') next.underline = true;
    if (tag === 's' || tag === 'del') next.strike = true;
    if (tag === 'sup') next.superscript = true;
    if (tag === 'sub') next.subscript = true;
    if (tag === 'code') next.code = true;

    const content = [...node.childNodes].map((child) => inlineXml(child, state, next)).join('');
    if (tag !== 'a') return content;
    const href = node.getAttribute('href');
    if (!href || href.startsWith('#') || !content) return content;
    const relationshipId = state.addRelationship(
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
      absoluteUrl(href),
      'External'
    );
    return `<w:hyperlink r:id="${relationshipId}" w:history="1">${content}</w:hyperlink>`;
  }

  function paragraphXml(content, style = 'Normal', options = {}) {
    const properties = [];
    if (style) properties.push(`<w:pStyle w:val="${style}"/>`);
    if (options.keepNext) properties.push('<w:keepNext/>');
    if (options.pageBreakBefore) properties.push('<w:pageBreakBefore/>');
    if (options.numId) {
      properties.push(`<w:numPr><w:ilvl w:val="${options.level || 0}"/><w:numId w:val="${options.numId}"/></w:numPr>`);
    }
    return `<w:p><w:pPr>${properties.join('')}</w:pPr>${content || '<w:r><w:t></w:t></w:r>'}</w:p>`;
  }

  function paragraphFromElement(element, state, style = 'Normal', options = {}) {
    const children = [...element.childNodes].filter((child) => {
      if (child.nodeType !== Node.ELEMENT_NODE) return true;
      return !['ul', 'ol', 'figure', 'table'].includes(child.tagName.toLowerCase());
    });
    const content = children.map((child) => inlineXml(child, state)).join('');
    if (!content && !options.allowEmpty) return '';
    return paragraphXml(content, style, options);
  }

  function imageDrawingXml(record) {
    const { relationshipId, size, number, alt } = record;
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
      `<wp:extent cx="${size.width}" cy="${size.height}"/>` +
      `<wp:docPr id="${number}" name="Article image ${number}" descr="${escapeXml(alt)}"/>` +
      '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic><pic:nvPicPr>' +
      `<pic:cNvPr id="${number}" name="image${number}" descr="${escapeXml(alt)}"/><pic:cNvPicPr/>` +
      '</pic:nvPicPr><pic:blipFill>' +
      `<a:blip r:embed="${relationshipId}"/><a:stretch><a:fillRect/></a:stretch>` +
      '</pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/>' +
      `<a:ext cx="${size.width}" cy="${size.height}"/></a:xfrm>` +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>' +
      '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }

  function imageBlocks(image, state) {
    const record = state.imageElements.get(image);
    if (!record) {
      const alt = image.alt || 'Article image';
      return paragraphXml(textRun(`[Image unavailable in Word export: ${alt}]`, { italic: true, color: '657483' }), 'Caption');
    }
    return paragraphXml(imageDrawingXml(record), 'Image');
  }

  function figureBlocks(figure, state) {
    const blocks = [];
    figure.querySelectorAll(':scope > img, :scope > figure > img').forEach((image) => {
      blocks.push(imageBlocks(image, state));
      const imageFigure = image.closest('figure');
      const nestedCaption = imageFigure && imageFigure !== figure
        ? imageFigure.querySelector(':scope > figcaption')
        : null;
      if (nestedCaption?.textContent.trim()) {
        blocks.push(paragraphFromElement(nestedCaption, state, 'Caption'));
      }
    });
    const caption = figure.querySelector(':scope > figcaption');
    if (caption?.textContent.trim()) blocks.push(paragraphFromElement(caption, state, 'Caption'));
    return blocks.join('');
  }

  function listBlocks(list, state, level = 0, existingNumId = null) {
    const ordered = list.tagName.toLowerCase() === 'ol';
    const numId = existingNumId || state.addNumbering(ordered ? 2 : 1);
    const blocks = [];
    [...list.children].filter((child) => child.tagName?.toLowerCase() === 'li').forEach((item) => {
      blocks.push(paragraphFromElement(item, state, 'ListParagraph', { numId, level }));
      [...item.children].filter((child) => ['ul', 'ol'].includes(child.tagName.toLowerCase())).forEach((nested) => {
        blocks.push(listBlocks(nested, state, Math.min(level + 1, 8), numId));
      });
    });
    return blocks.join('');
  }

  function tableBlocks(table, state) {
    const rows = [...table.rows];
    if (!rows.length) return '';
    const columnCount = Math.max(...rows.map((row) => row.cells.length), 1);
    const width = Math.floor(9360 / columnCount);
    const grid = new Array(columnCount).fill(`<w:gridCol w:w="${width}"/>`).join('');
    const rowXml = rows.map((row, rowIndex) => {
      const cells = [...row.cells].map((cell) => {
        const cellContent = [...cell.childNodes].map((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && ['p', 'div'].includes(node.tagName.toLowerCase())) {
            return paragraphFromElement(node, state, rowIndex === 0 ? 'TableHeader' : 'TableText');
          }
          return inlineXml(node, state, rowIndex === 0 ? { bold: true } : {});
        }).join('');
        const paragraph = cellContent.includes('<w:p>') ? cellContent : paragraphXml(cellContent, rowIndex === 0 ? 'TableHeader' : 'TableText');
        return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:vAlign w:val="center"/>` +
          '<w:tcMar><w:top w:w="90" w:type="dxa"/><w:start w:w="120" w:type="dxa"/>' +
          '<w:bottom w:w="90" w:type="dxa"/><w:end w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>' +
          `${paragraph}</w:tc>`;
      }).join('');
      return `<w:tr>${cells}</w:tr>`;
    }).join('');
    return '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/>' +
      '<w:tblLayout w:type="fixed"/><w:tblBorders>' +
      ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((edge) => `<w:${edge} w:val="single" w:sz="4" w:color="CDD5DD"/>`).join('') +
      `</w:tblBorders></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rowXml}</w:tbl>`;
  }

  function elementBlocks(element, state) {
    const tag = element.tagName.toLowerCase();
    if (tag === 'h1') return paragraphFromElement(element, state, 'Heading1', { keepNext: true });
    if (tag === 'h2') return paragraphFromElement(element, state, 'Heading2', { keepNext: true });
    if (tag === 'h3') return paragraphFromElement(element, state, 'Heading3', { keepNext: true });
    if (tag === 'h4' || tag === 'h5' || tag === 'h6') return paragraphFromElement(element, state, 'Heading4', { keepNext: true });
    if (tag === 'p') return paragraphFromElement(element, state, 'Normal');
    if (tag === 'blockquote') {
      const paragraphs = [...element.querySelectorAll(':scope > p')];
      return paragraphs.length
        ? paragraphs.map((paragraph) => paragraphFromElement(paragraph, state, 'Quote')).join('')
        : paragraphFromElement(element, state, 'Quote');
    }
    if (tag === 'ul' || tag === 'ol') return listBlocks(element, state);
    if (tag === 'figure') return figureBlocks(element, state);
    if (tag === 'img') return imageBlocks(element, state);
    if (tag === 'table') return tableBlocks(element, state);
    if (tag === 'pre') return paragraphXml(textRun(element.textContent, { code: true }), 'Code');
    if (tag === 'hr') return paragraphXml('<w:r><w:t></w:t></w:r>', 'HorizontalRule');
    if (tag === 'aside') return paragraphFromElement(element, state, 'MediaNote');
    if (tag === 'br') return paragraphXml('<w:r><w:br/></w:r>');

    return [...element.childNodes].map((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) return elementBlocks(child, state);
      if (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim()) return paragraphXml(textRun(child.nodeValue), 'Normal');
      return '';
    }).join('');
  }

  function stylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="20262E"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="160" w:line="300" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Subtitle"/><w:qFormat/><w:pPr><w:spacing w:before="0" w:after="120"/><w:jc w:val="center"/></w:pPr><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:b/><w:color w:val="17324D"/><w:sz w:val="56"/><w:szCs w:val="56"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Metadata"/><w:pPr><w:spacing w:after="100" w:line="280" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:color w:val="4C5C6C"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Metadata"><w:name w:val="Metadata"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:spacing w:after="180"/><w:jc w:val="center"/></w:pPr><w:rPr><w:color w:val="657483"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="320" w:after="160"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:color w:val="17324D"/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="280" w:after="140"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:color w:val="24527A"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="220" w:after="100"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:color w:val="24527A"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="180" w:after="80"/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:b/><w:color w:val="355A7A"/><w:sz w:val="23"/><w:szCs w:val="23"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="420" w:right="240"/><w:spacing w:before="80" w:after="160"/><w:pBdr><w:left w:val="single" w:sz="14" w:space="8" w:color="9DB1C4"/></w:pBdr></w:pPr><w:rPr><w:i/><w:color w:val="455565"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="Caption"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="40" w:after="160"/><w:jc w:val="center"/></w:pPr><w:rPr><w:i/><w:color w:val="657483"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Image"><w:name w:val="Image"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="120" w:after="40"/><w:jc w:val="center"/><w:keepNext/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="MediaNote"><w:name w:val="Media Note"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="240" w:right="240"/><w:spacing w:before="100" w:after="140"/><w:pBdr><w:top w:val="single" w:sz="4" w:color="D8DEE5"/><w:left w:val="single" w:sz="4" w:color="D8DEE5"/><w:bottom w:val="single" w:sz="4" w:color="D8DEE5"/><w:right w:val="single" w:sz="4" w:color="D8DEE5"/></w:pBdr><w:shd w:val="clear" w:fill="F7F9FB"/></w:pPr><w:rPr><w:color w:val="455565"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:contextualSpacing/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="80" w:after="120"/><w:ind w:left="240" w:right="240"/><w:shd w:val="clear" w:fill="EEF2F6"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="HorizontalRule"><w:name w:val="Horizontal Rule"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="120" w:after="120"/><w:pBdr><w:bottom w:val="single" w:sz="4" w:color="D8DEE5"/></w:pBdr></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Source"><w:name w:val="Source"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="240" w:after="0"/><w:pBdr><w:top w:val="single" w:sz="4" w:space="8" w:color="D8DEE5"/></w:pBdr></w:pPr><w:rPr><w:color w:val="657483"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="40" w:line="260" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="TableHeader"><w:name w:val="Table Header"/><w:basedOn w:val="TableText"/><w:rPr><w:b/><w:color w:val="17324D"/></w:rPr></w:style>
</w:styles>`;
  }

  function numberingXml(instances) {
    const levels = (bullet) => new Array(9).fill(null).map((_, level) => {
      const left = 720 + (level * 360);
      const hanging = 360;
      const format = bullet ? 'bullet' : 'decimal';
      const text = bullet ? ['•', '○', '▪'][level % 3] : `%${level + 1}.`;
      const font = bullet ? '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:hint="default"/></w:rPr>' : '';
      return `<w:lvl w:ilvl="${level}"><w:start w:val="1"/><w:numFmt w:val="${format}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="${left}"/></w:tabs><w:ind w:left="${left}" w:hanging="${hanging}"/><w:spacing w:after="80" w:line="300" w:lineRule="auto"/></w:pPr>${font}</w:lvl>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${levels(true)}</w:abstractNum>
  <w:abstractNum w:abstractNumId="2"><w:multiLevelType w:val="multilevel"/>${levels(false)}</w:abstractNum>
  ${instances.map((item) => `<w:num w:numId="${item.numId}"><w:abstractNumId w:val="${item.abstractNumId}"/></w:num>`).join('')}
</w:numbering>`;
  }

  function relationshipsXml(state) {
    const fixed = [
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>',
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>',
      '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'
    ];
    const dynamic = state.relationships.map((relationship) =>
      `<Relationship Id="${relationship.id}" Type="${relationship.type}" Target="${escapeXml(relationship.target)}"${relationship.targetMode ? ` TargetMode="${relationship.targetMode}"` : ''}/>`
    );
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${fixed.concat(dynamic).join('')}</Relationships>`;
  }

  function contentTypesXml(state) {
    const imageDefaults = [...state.imageTypes.entries()].map(([extension, type]) =>
      `<Default Extension="${extension}" ContentType="${type}"/>`
    ).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${imageDefaults}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function createDocx(config, options = {}) {
    const JSZip = await ensureJsZip(config);
    const zip = new JSZip();
    const content = cleanArticleContent(config);
    const hero = findHeroFigure(config);
    const mediaContainer = document.createElement('div');
    if (hero) mediaContainer.appendChild(hero);
    mediaContainer.appendChild(content);

    const state = {
      zip,
      relationships: [],
      imageElements: new Map(),
      imageTypes: new Map(),
      numberingInstances: [],
      nextRelationshipId: 10,
      nextImageNumber: 1,
      nextNumId: 1,
      addRelationship(type, target, targetMode = '') {
        const id = `rId${this.nextRelationshipId++}`;
        this.relationships.push({ id, type, target, targetMode });
        return id;
      },
      addNumbering(abstractNumId) {
        const numId = this.nextNumId++;
        this.numberingInstances.push({ numId, abstractNumId });
        return numId;
      }
    };

    await prepareImages(mediaContainer, state);

    const title = paragraphXml(textRun(config.title), 'Title');
    const description = config.description ? paragraphXml(textRun(config.description), 'Subtitle') : '';
    const metadataText = [config.author ? `By ${config.author}` : '', config.published ? `Published ${config.published}` : '']
      .filter(Boolean).join(' | ');
    const metadata = metadataText ? paragraphXml(textRun(metadataText), 'Metadata') : '';
    const heroXml = hero ? figureBlocks(hero, state) : '';
    const articleXml = [...content.childNodes].map((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) return elementBlocks(node, state);
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) return paragraphXml(textRun(node.nodeValue), 'Normal');
      return '';
    }).join('');
    const sourceId = state.addRelationship(
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
      config.sourceUrl,
      'External'
    );
    const sourceXml = paragraphXml(
      textRun('Online article: ', { color: '657483' }) +
      `<w:hyperlink r:id="${sourceId}" w:history="1">${textRun(config.sourceUrl, { color: '24527A', underline: true })}</w:hyperlink>`,
      'Source'
    );

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>${title}${description}${metadata}${heroXml}${articleXml}${sourceXml}
    <w:sectPr><w:footerReference w:type="default" r:id="rId4"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>
  </w:body>
</w:document>`;

    const now = new Date().toISOString();
    zip.file('[Content_Types].xml', contentTypesXml(state));
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
    zip.file('word/document.xml', documentXml);
    zip.file('word/_rels/document.xml.rels', relationshipsXml(state));
    zip.file('word/styles.xml', stylesXml());
    zip.file('word/numbering.xml', numberingXml(state.numberingInstances));
    zip.file('word/settings.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:zoom w:percent="100"/><w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`);
    zip.file('word/footer1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="80"/></w:pPr><w:r><w:rPr><w:color w:val="7A8794"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${escapeXml(config.siteTitle)} | Page </w:t></w:r><w:fldSimple w:instr="PAGE"><w:r><w:rPr><w:color w:val="7A8794"/><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`);
    zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(config.title)}</dc:title><dc:subject>${escapeXml(config.description)}</dc:subject><dc:creator>${escapeXml(config.author || config.siteTitle)}</dc:creator><cp:lastModifiedBy>${escapeXml(config.siteTitle)}</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`);
    zip.file('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>${escapeXml(config.siteTitle)} article exporter</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><Company></Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>1.0</AppVersion></Properties>`);

    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: DOCX_MIME,
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    const filename = `${slugify(config.title)}.docx`;
    window.TimeWalkArticleExport.lastDocx = { blob, filename };
    if (options.download !== false) saveBlob(blob, filename);
    return { blob, filename };
  }

  async function handleFormat(root, format) {
    const config = configFromRoot(root);
    if (format === 'pdf') {
      openPdf(config);
      return;
    }
    if (format !== 'docx') return;

    closeMenu(root);
    setBusy(root, true, 'Preparing Word download.');
    showToast('Preparing Word download...');
    try {
      await createDocx(config);
      setStatus(root, 'Word document download started.');
      showToast('Word document download started.');
    } catch (error) {
      console.error('Word export failed', error);
      setStatus(root, 'Word download failed.');
      showToast('Word download failed. Please try again.');
    } finally {
      setBusy(root, false);
    }
  }

  function setupRoot(root) {
    if (root.dataset.articleExportReady === 'true') return;
    root.dataset.articleExportReady = 'true';
    root.querySelector('.article-download__trigger')?.addEventListener('click', () => toggleMenu(root));
    root.querySelectorAll('[data-article-export-format]').forEach((button) => {
      button.addEventListener('click', () => handleFormat(root, button.dataset.articleExportFormat));
    });
  }

  function setup() {
    document.querySelectorAll(EXPORT_SELECTOR).forEach(setupRoot);
    document.addEventListener('click', (event) => {
      document.querySelectorAll(EXPORT_SELECTOR).forEach((root) => {
        if (!root.contains(event.target)) closeMenu(root);
      });
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll(EXPORT_SELECTOR).forEach((root) => {
        const menu = root.querySelector('.article-download__menu');
        if (menu && !menu.hidden) closeMenu(root, true);
      });
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get(PDF_QUERY_KEY) === PDF_QUERY_VALUE) activatePdfMode({
      autoPrint: params.get('article-export-auto') !== 'false'
    }).catch((error) => {
      console.error('PDF view failed', error);
      showToast('The print-ready view could not be prepared.');
    });
  }

  window.TimeWalkArticleExport = {
    activatePdfMode,
    buildPrintSheet,
    cleanArticleContent,
    createDocx
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})();
