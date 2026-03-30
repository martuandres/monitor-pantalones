const puppeteer = require('puppeteer');

// --- CONFIGURACIÓN ---
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_ID;
// ---------------------


async function enviarTelegram(mensaje) {
  // Le sumamos el parámetro para FORZAR el sonido en el celu
  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(mensaje)}&disable_notification=false`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.ok) {
      console.log("📨 Telegram enviado con orden de SONAR.");
    } else {
      console.log("❌ Telegram respondió pero con error:", data.description);
    }
  } catch (e) {
    console.log("❌ Error de red al contactar a Telegram.");
  }
}

async function chequearStock() {
  // 'headless: "new"' hace que el robot sea invisible y no te moleste
  const browser = await puppeteer.launch({ 
  headless: "new", 
  args: ['--no-sandbox', '--disable-setuid-sandbox'] 
});
  const page = await browser.newPage();

  try {
    console.log(`[${new Date().toLocaleTimeString()}] 🕵️‍♀️ Revisando stock en TG Store...`);
    
    // Vamos a la página del pantalón
    await page.goto('https://tgstore.empretienda.com.ar/pantalones/pant-essential', { waitUntil: 'networkidle2' });

    // 1. Simular clic en el Talle 4
    await page.evaluate(() => {
      const opciones = Array.from(document.querySelectorAll('.product-vip__attribute-item'));
      const talle4 = opciones.find(opt => opt.innerText.trim() === '4');
      if (talle4) talle4.click();
    });

    // 2. Esperamos 2 segundos a que la página reaccione al clic
    await new Promise(r => setTimeout(r, 2000));

    // 3. Leemos el estado de los colores para ese talle
    const stock = await page.evaluate(() => {
      const botones = Array.from(document.querySelectorAll('.product-vip__attribute-item'));
      return botones.map(b => ({
        nombre: b.innerText.trim(),
        // Si NO tiene la clase '--not-available', hay stock
        disponible: !b.classList.contains('product-vip__attribute-item--not-available')
      }));
    });

    // Filtramos tus favoritos (Negro y Gris Melange)
    const misFavoritos = stock.filter(s => s.nombre === 'Negro' || s.nombre === 'Gris melange');

    for (const panta of misFavoritos) {
      if (panta.disponible) {
        console.log(`✅ ¡HAY STOCK DE ${panta.nombre.toUpperCase()}!`);
        
        const aviso = `🚨 ¡MARTU, HAY STOCK! \n\nEl Pant Essential "${panta.nombre}" en talle 4 está disponible. \n\nCompralo acá: https://tgstore.empretienda.com.ar/pantalones/pant-essential`;
        
        await enviarTelegram(aviso);
      } else {
        console.log(`❌ ${panta.nombre}: Sigue sin stock en talle 4.`);
      }
    }

  } catch (error) {
    console.log("⚠️ Hubo un error de conexión, reintentando en la próxima hora...");
  }

  // Cerramos el navegador del robot para no consumir RAM
  await browser.close();
}

// Programamos para que se ejecute cada 1 hora (3600000 milisegundos)
const UNA_HORA = 3600000;
setInterval(chequearStock, UNA_HORA);

// Lo corremos por primera vez ahora mismo
chequearStock();
console.log("🚀 Robot activado. Podés minimizar esta terminal.");
