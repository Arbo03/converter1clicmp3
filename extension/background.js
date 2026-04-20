const BACKEND = 'http://localhost:3000';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'convertir-mp3',
    title: '🎵 Convertir a MP3 con 1Clic',
    contexts: ['link'],
    targetUrlPatterns: [
      '*://*.youtube.com/watch*',
      '*://youtu.be/*',
      '*://vimeo.com/*'
    ]
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== 'convertir-mp3') return;

  const url = info.linkUrl;

  chrome.notifications.create('inicio', {
    type: 'basic',
    iconUrl: 'icon.png',
    title: '1ClicMP3',
    message: '⏳ Conversión iniciada, espera unos segundos...'
  });

  try {
    const res = await fetch(`${BACKEND}/api/convertir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!res.ok) throw new Error('Error en el servidor');

    const { taskId } = await res.json();

    const intervalo = setInterval(async () => {
      try {
        const estadoRes = await fetch(`${BACKEND}/api/estado/${taskId}`);
        const { estado } = await estadoRes.json();

        if (estado === 'completado') {
          clearInterval(intervalo);

          chrome.downloads.download({
            url: `${BACKEND}/download/${taskId}`,
            filename: 'audio.mp3',
            saveAs: false
          });

          chrome.notifications.create('exito', {
            type: 'basic',
            iconUrl: 'icon.png',
            title: '1ClicMP3 ✅',
            message: '¡Listo! El MP3 se está descargando.'
          });

        } else if (estado === 'error') {
          clearInterval(intervalo);
          chrome.notifications.create('error', {
            type: 'basic',
            iconUrl: 'icon.png',
            title: '1ClicMP3 ❌',
            message: 'Error al convertir. ¿El vídeo es privado?'
          });
        }
      } catch {
        clearInterval(intervalo);
      }
    }, 4000);

  } catch (err) {
    chrome.notifications.create('error-red', {
      type: 'basic',
      iconUrl: 'icon.png',
      title: '1ClicMP3 ❌',
      message: 'No se pudo conectar. ¿Está el servidor arrancado?'
    });
  }
});