const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = 3000;

const UPLOADS_DIR = 'uploads';
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}
const upload = multer({ dest: UPLOADS_DIR });

app.use(express.static('public'));

app.post('/processar', upload.single('imagem'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
  }

  const tempPath = req.file.path;
  const originalNameBase = path.parse(req.file.originalname).name;
  
  const bmpPath = path.join(UPLOADS_DIR, `${originalNameBase}.bmp`);
  
  try {
    const convertCmd = `convert "${tempPath}" -type TrueColor "${bmpPath}"`;
    console.log(`Executando: ${convertCmd}`);
    execSync(convertCmd);

    const convCmd = `./bmp2oac3 "${bmpPath}"`; 
    console.log(`Executando: ${convCmd}`);
    execSync(convCmd);

    const dataPath = path.join(UPLOADS_DIR, `${originalNameBase}.data`);
    const binPath = path.join(UPLOADS_DIR, `${originalNameBase}.bin`);
    const mifPath = path.join(UPLOADS_DIR, `${originalNameBase}.mif`);
    
    const OUTPUT_DIR = 'public';
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR);
    }
    
    fs.renameSync(dataPath, path.join(OUTPUT_DIR, `${originalNameBase}.data`));
    fs.renameSync(binPath, path.join(OUTPUT_DIR, `${originalNameBase}.bin`));
    fs.renameSync(mifPath, path.join(OUTPUT_DIR, `${originalNameBase}.mif`));
    
    console.log(`Arquivos processados movidos para a pasta: ${OUTPUT_DIR}`);

    res.json({
      status: 'ok',
      message: 'Imagem processada com sucesso.',
      files: [
        `${originalNameBase}.data`,
        `${originalNameBase}.bin`,
        `${originalNameBase}.mif`
      ]
    });

  } catch (err) {
    console.error('Falha no processamento:', err);
    res.status(500).json({
      error: 'Erro ao processar a imagem',
      detail: err.message,
      stdout: err.stdout ? err.stdout.toString() : null,
      stderr: err.stderr ? err.stderr.toString() : null
    });
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    if (fs.existsSync(bmpPath)) fs.unlinkSync(bmpPath);
    console.log('Limpeza dos arquivos temporários concluída.');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Para testar, envie uma imagem para o endpoint POST /processar`);
});