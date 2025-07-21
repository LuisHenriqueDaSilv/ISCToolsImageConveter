const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {v4} = require('uuid')
const cors = require('cors')

const app = express();
app.use(cors())
const PORT = 3000;

const UPLOADS_DIR = 'uploads';
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}
const upload = multer({ dest: UPLOADS_DIR });

function sanitizarNomeArquivo(nome) {
  const ultimaPosicaoPonto = nome.lastIndexOf('.');
  
  let base = ultimaPosicaoPonto === -1 ? nome : nome.slice(0, ultimaPosicaoPonto);
  const extensao = ultimaPosicaoPonto === -1 ? '' : nome.slice(ultimaPosicaoPonto);

  base = base
    .toLowerCase()
    .replace(/\s+/g, '_')              
    .replace(/[^a-z0-9_\-]/g, '');

  return base + extensao.toLowerCase();
}

app.use(express.static('public'));

app.post('/processar', upload.single('imagem'), (req, res) => {
  console.log(req.file)
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
  }

  const tempPath = req.file.path;
  const originalNameBase =  path.parse(req.file.originalname).name;
  const formatedName = sanitizarNomeArquivo(originalNameBase)
  fs.rename(`${UPLOADS_DIR}/${originalNameBase}`, `${UPLOADS_DIR}/${formatedName}.bmp`, err => {
    if (err) {
      console.error('Erro ao renomear:', err);
    } else {
      console.log('Arquivo renomeado com sucesso!');
    }
  })
  const bmpPath = path.join(UPLOADS_DIR, `${formatedName}.bmp`);
  
  try {
    const convertCmd = `convert "${tempPath}" -type TrueColor "${bmpPath}"`;
    console.log(`Executando: ${convertCmd}`);
    execSync(convertCmd);

    const convCmd = `./bmp2oac3 "${bmpPath}"`; 
    console.log(`Executando: ${convCmd}`);
    execSync(convCmd);

    const dataPath = path.join(UPLOADS_DIR, `${formatedName}.data`);
    const binPath = path.join(UPLOADS_DIR, `${formatedName}.bin`);
    const mifPath = path.join(UPLOADS_DIR, `${formatedName}.mif`);
    
    const OUTPUT_DIR = 'public';
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR);
    }
    
    fs.renameSync(dataPath, path.join(OUTPUT_DIR, `${formatedName}.data`));
    fs.renameSync(binPath, path.join(OUTPUT_DIR, `${formatedName}.bin`));
    fs.renameSync(mifPath, path.join(OUTPUT_DIR, `${formatedName}.mif`));
    
    console.log(`Arquivos processados movidos para a pasta: ${OUTPUT_DIR}`);

    res.json({
      status: 'ok',
      message: 'Imagem processada com sucesso.',
      files: [
        {
          filename: `${formatedName}.data`,
          url: `http://localhost:3000/${formatedName}.data`,
        }
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
})