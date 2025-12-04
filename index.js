const express = require("express");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

const mgDir = path.join(__dirname, "mg");

// 이미지 생성 API
app.get("/image", async (req, res) => {
    try {
        const imgNum = parseInt(req.query.img) || 1;
        const text = req.query.text || "안녕하세요";
        const name = req.query.name || "";
        const fontSize = parseInt(req.query.size) || 28;

        // 이미지 파일 찾기
        const imageFile = `${imgNum}.jpg`;
        const imagePath = path.join(mgDir, imageFile);

        if (!fs.existsSync(imagePath)) {
            return res.status(404).send(`이미지를 찾을 수 없습니다: ${imageFile}`);
        }

        // 이미지 메타데이터
        const metadata = await sharp(imagePath).metadata();
        const width = metadata.width;
        const height = metadata.height;

        console.log(`📸 생성 중: ${imageFile} (${width}x${height})`);

        // 텍스트 SVG 생성
        let fontSize_ = Math.floor(fontSize);
        let nameSize = Math.floor(fontSize * 1.3);
        const padding = 40;
        const boxPadding = 30;
        const lineHeight = fontSize_ + 8;
        
        // 밑부분 반투명 검은색 박스 설정
        const boxHeight = Math.floor(height * 0.25);
        const boxMargin = 20;
        const boxTop = height - boxHeight - boxMargin;
        const boxWidth = width - (boxMargin * 2);
        const boxRadius = 15;

        let textSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <style>
            .text { font-family: Arial, sans-serif; font-weight: bold; }
            .shadow { filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.8)); }
        </style>
    </defs>
    <!-- 둥근 모서리 반투명 검은색 배경 박스 -->
    <rect x="${boxMargin}" y="${boxTop}" width="${boxWidth}" height="${boxHeight}" rx="${boxRadius}" ry="${boxRadius}" fill="black" opacity="0.6" />`;

        const nameY = boxTop + boxPadding + Math.floor(nameSize * 0.8);
        let textY = nameY + lineHeight + 5;
        const maxWidth = boxWidth - (padding * 2);
        const charWidth = fontSize_ * 0.55;
        const maxCharsPerLine = Math.floor(maxWidth / charWidth);

        // 이름 표시
        if (name) {
            textSvg += `<text x="${boxMargin + padding}" y="${nameY}" font-size="${nameSize}" fill="white" class="text shadow">${escapeXml(name)}</text>`;
        }

        // 대사 표시
        const lines = text.split("\n");

        lines.forEach((line) => {
            if (line.trim()) {
                const wrappedLines = wrapText(line, maxCharsPerLine);
                wrappedLines.forEach((wrappedLine) => {
                    if (textY < boxTop + boxHeight - 15) {
                        textSvg += `<text x="${boxMargin + padding}" y="${textY}" font-size="${fontSize_}" fill="white" class="text shadow">${escapeXml(wrappedLine)}</text>`;
                        textY += lineHeight;
                    }
                });
            }
        });

        textSvg += `</svg>`;

        // 이미지 처리
        let result = sharp(imagePath).composite([{
            input: Buffer.from(textSvg),
            blend: 'over'
        }]);

        res.type("image/png");
        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        const output = await result.png().toBuffer();
        res.send(output);

    } catch (err) {
        console.error("❌ 에러:", err.message);
        res.status(500).send(`에러: ${err.message}`);
    }
});

function escapeXml(str) {
    return str.replace(/[&<>"']/g, function (c) {
        switch (c) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&apos;';
        }
    });
}

function wrapText(text, maxChars) {
    if (!text || maxChars <= 0) return [text];
    if (text.length <= maxChars) return [text];
    
    const lines = [];
    let current = "";
    
    for (let char of text) {
        if (current.length >= maxChars) {
            lines.push(current);
            current = char;
        } else {
            current += char;
        }
    }
    
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [text];
}

app.listen(PORT, () => {
    console.log(`🚀 서버 시작: http://localhost:${PORT}/image`);
    console.log(`📱 사용법: /image?img=1&name=민수&text=안녕하세요&size=28`);
    console.log(`✅ 준비 완료!`);
});
