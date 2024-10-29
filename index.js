const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const Jimp = require('jimp'); // Import Jimp
const fs = require('fs');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('ready', () => {
    console.log('Bot siap!');
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR Code:', qr);
});

client.on('authenticated', () => {
    console.log('Authenticated!');
});

client.on('auth_failure', () => {
    console.error('Authentication failed, please restart the app.');
});

// Fungsi untuk mendapatkan waktu saat ini
async function getTime() {
    const apiKey = 'TI6N1KYXX5G9'; // Ganti dengan API key Anda
    const url = `http://api.timezonedb.com/v2.1/get-time-zone?key=${apiKey}&format=json&by=zone&zone=Asia/Jakarta`; // Ganti dengan zona waktu yang sesuai

    try {
        const response = await axios.get(url);
        const data = response.data;

        if (data.status === 'OK') {
            return `Waktu saat ini di Jakarta: ${data.formatted}; UTC Offset: ${data.gmtOffset / 3600} jam`;
        } else {
            return 'Gagal mendapatkan waktu. Silakan coba lagi.';
        }
    } catch (error) {
        console.error('Error fetching time:', error);
        return 'Terjadi kesalahan saat mengambil waktu.';
    }
}

// Fungsi untuk mendapatkan cuaca
async function getWeather(city) {
    const apiKey = '591737dafc49bf9aad8c9095f5d75bb0'; // Ganti dengan API key Anda
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`; // Menggunakan satuan metric untuk suhu dalam Celsius

    try {
        const response = await axios.get(url);
        const data = response.data;

        if (data.cod === 200) {
            const weatherDescription = data.weather[0].description;
            const temperature = data.main.temp;
            const humidity = data.main.humidity;
            const windSpeed = data.wind.speed;

            return `Cuaca di ${city}:\nDeskripsi: ${weatherDescription}\nSuhu: ${temperature }°C\nKelembapan: ${humidity}%\nKecepatan Angin: ${windSpeed} m/s`;
        } else {
            return `Gagal mendapatkan cuaca untuk kota ${city}. Pastikan nama kota benar.`;
        }
    } catch (error) {
        console.error('Error fetching weather:', error);
        return 'Terjadi kesalahan saat mengambil informasi cuaca.';
    }
}

// Fungsi untuk membuat stiker dari gambar
async function createSticker(imageBuffer) {
    try {
        console.log('Ukuran buffer gambar:', imageBuffer.length); // Log ukuran buffer
        console.log('MIME type yang digunakan:', Jimp.MIME_WEBP); // Log MIME type yang digunakan

        // Memastikan imageBuffer adalah buffer yang valid
        if (!Buffer.isBuffer(imageBuffer)) {
            throw new Error('imageBuffer bukan buffer yang valid');
        }

        const image = await Jimp.read(imageBuffer); // Pastikan imageBuffer adalah buffer yang valid
        image.resize(512, 512) // Resize gambar
             .quality(100); // Set kualitas

        // Menggunakan MIME yang benar
        const mimeType = Jimp.MIME_WEBP; // Pastikan kita menggunakan Jimp.MIME_WEBP
        const buffer = await image.getBufferAsync(mimeType); // Pastikan kita menggunakan Jimp.MIME_WEBP
        return buffer; // Kembalikan buffer
    } catch (error) {
        console.error('Error in createSticker:', error);
        throw error; // Lempar kembali error untuk ditangani di tempat lain
    }
}

// Event ketika menerima pesan
client.on('message', async (message) => {
    console.log(`Pesan diterima: ${message.body} dari ${message.from}`);
	
    // Mendapatkan chat
    const chat = await message.getChat();

    // Periksa apakah chat dan participants terdefinisi
    if (chat && chat.participants) {
        const senderId = message.from;
        const chatId = chat.id._serialized;

        console.log(`Chat ID: ${chatId}`); // Log ID grup untuk debugging

        // Variabel untuk memeriksa status admin
        let isAdmin = false;

        // Verifikasi apakah pengirim adalah admin grup
        const participant = chat.participants.find(p => p.id._serialized === senderId);
        if (participant) {
            isAdmin = participant.isAdmin;
            console.log(`Participant: ${JSON.stringify(participant)}`); // Log participant untuk debugging

            if (isAdmin) {
                console.log('Pengirim adalah admin grup');

                // Cek apakah pesan memiliki media
                if (message.hasMedia) {
                    const media = await message.downloadMedia();
                    const imageBuffer = Buffer.from(media.data, 'base64');

                    try {
                        const stickerBuffer = await createSticker(imageBuffer);
                        // Simpan stiker ke file
                        const stickerPath = 'sticker.webp';
                        fs.writeFileSync(stickerPath, stickerBuffer);
                        console.log('Stiker berhasil dibuat!');

                        // Kirim stiker kembali ke pengguna
                        const stickerMedia = MessageMedia.fromFilePath(stickerPath);
                        client.sendMessage(message.from, stickerMedia);
                    } catch (error) {
                        console.error('Gagal membuat stiker:', error);
                    }
                } else {
                    console.log('Pesan tidak memiliki media.');
                }
            } else {
                console.log('Pengirim bukan admin grup');
            }
        } else {
            console.log('Pengirim tidak ditemukan dalam daftar peserta.');
        }

        // Memeriksa perintah cuaca
        if (message.body.startsWith('!cuaca ')) {
            const city = message.body.split(' ')[1];
            const weatherInfo = await getWeather(city);
            message.reply(weatherInfo);
        } else if (message.body === '!info') {
            message.reply('Selamat datang di RF Bot. Pembuat bot ini adalah RareFlipz.\nKamu bisa menggunakan perintah berikut:\n\n!menu - untuk melihat daftar perintah.\n\nUntuk informasi lebih lanjut, kunjungi Instagram pembuat bot: https://www.instagram.com/valianvino');
        } else if (message.body === '!menu') {
            message.reply('Daftar perintah:\n\n!cuaca [nama_kota] - informasi cuaca.\n!waktu - untuk mendapatkan waktu saat ini.\n!jokes - jokes lucu.\n!stiker - (Maintenance).');
        } else if (message.body === '!waktu') {
            const timeInfo = await getTime();
            message.reply(timeInfo);
        } else if (message.body === '!jokes') {
            const jokes = [
                'Kenapa sih kerang hidupnya di laut? Soalnya kalo hidupnya di darat namanya kering.',
                'Pak, barusan saya mau masak, tapi tiba-tiba pancinya jalan sendiri nggak tau ke mana. Ternyata panci petualang.',
                'Kalo kamu masih diselimuti masalah berarti kamu manusia, kalo kamu diselimuti wijen berarti onde-onde.',
                'Kenapa nyamuk bunyinya nguung? Karena dia minumnya darah, coba kalo minumnya bensin, bunyinya jadi bruuum.',
                'Kalo cinta masih mandang fisik, suruh aja pacaran sama ikan karena ikan banyak fisiknya.',
                'Saya tadi beli obat tidur di apotek, saya bawa pulang pelan-pelan takut obatnya bangun.',
                'Anak saya ngeyel kuliah malah ngambil komputer, pas pulang ternyata mukanya bonyok.',
                'Di balik usapan tangan suami ke kepala istri, sebenarnya dia ingin memastikan di kepala istrinya nggak ada paku.',
                'Enak ya jadi maling banyak yang ngejar-ngejar dan nggak pake mandang fisik.',
                'Siapa nama asli nyamuk? Tatang! Kan ada lagunya: "Cicak-cicak di dinding. Diam-diam merayap. Tatang seekor nyamuk, hap. Lalu ditangkap..."',
                'Berapa jumlah kaki seekor kerbau? Delapan, yaitu: dua kaki kiri, dua kaki kanan, dua kaki depan, dan dua kaki belakang.',
                'Kalau semua jenis hewan sekolah, siapa yang sering terlambat? Kluwing (kaki seribu). Soalnya kakinya banyak, jadinya kalau pakai sepatu kelamaan.',
                'Apa bedanya balapan kuda sama balapan motor? Balapan kuda ada tempat parkir motor, jika balapan motor tidak ada tempat parkir kuda.',
                'Waktu kecil dia tinggal di Jawa Barat, tapi pas udah tua dia tinggal di Sumatera Selatan, siapa dia? Lembang, soalnya kalau udah udah namanya jadi Pa-Lembang.',
                'Hewan apa yang punya banyak keahlian?Kukang, bisa jadi kukang tambal ban, kukang servis motor, kukang nasi goreng, kukang sol sepatu, dan kukang lainnya.',
                'Kenapa di Indonesia sering ditanyain "Kapan nikah?" Karena indonesia adalah negara "Marrytime".',
                'Kendaraan apa yang bunyinya paling imut? Kereta, naik kereta api cute cute cute...',
                'Bedanya sarung sama kotak apa? Kalo sarung bisa kotak-kotak, kalau kotak nggak bisa sarung-sarung.',
                'Kenapa air mata warnanya bening? Katen kalo air yang warnanya ijo namanya air matcha.',
                'Kenapa kalau lagi naik sepeda motor maunya ketawa terus? Karena dia duduknya di atas jokes.',
                'Kuda apa yang jalannya belok ke kiri terus? Kuda yang dikunci stang.',
                'Kesenian apa yang selalu dilakukan nasabah bank, apakah itu? Tari tunai.'
            ];
            const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
            message.reply(randomJoke);
        } else if (isAdmin && message.body.startsWith('!kick ')) {
            const userId = message.body.split(' ')[1].replace('@', '') + '@c.us'; // Ubah format ID
            const participantToKick = chat.participants.find(p => p.id._serialized === userId);
            if (participantToKick) {
                await chat.removeParticipants([userId]);
                message.reply(`Pengguna ${userId} telah dikeluarkan dari grup.`);
            } else {
                message.reply('Pengguna tidak ditemukan.');
            }
        } else if (message.body.startsWith('!stiker')) {
        // Mengunduh media
        if (message.hasMedia) {
            const media = await message.downloadMedia(); // Mengunduh media
            if (media) {
                console.log('Tipe media:', media.mimetype); // Log tipe media

                // Memeriksa apakah media adalah gambar
                const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
                if (validImageTypes.includes(media.mimetype)) {
                    try {
                        // Pastikan kita menggunakan buffer yang benar
                        const stickerBuffer = await createSticker(Buffer.from(media.data, 'base64')); // Menggunakan buffer media
                        await message.reply(stickerBuffer, message.from, { mime: 'image/webp' });
                    } catch (error) {
                        console.error('Gagal membuat stiker:', error);
                        await message.reply('Gagal membuat stiker. Silakan coba lagi.');
                    }
                } else {
                    await message.reply('Format media tidak didukung. Silakan kirim gambar dalam format JPEG, PNG, atau WEBP.');
                }
            } else {
                await message.reply('Tidak ada media yang ditemukan.');
            }
        } else {
            await message.reply('Silakan kirim media untuk membuat stiker.');
        }
    }
    } else {
        console.log('Chat atau participants tidak terdefinisi');
    }
});

// Menjalankan client
client.initialize();