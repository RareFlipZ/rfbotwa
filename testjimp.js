const Jimp = require('jimp');

async function testJimp() {
    try {
        const image = await Jimp.read('D:\\rfbotwa\\test.jpg'); // Ganti dengan path gambar yang valid
        image.resize(512, 512) // Resize gambar
             .quality(100) // Set kualitas
             .write('output.webp'); // Simpan sebagai file WEBP
        console.log('Gambar berhasil diproses dan disimpan sebagai output.webp');
    } catch (error) {
        console.error('Error:', error);
    }
}

testJimp();