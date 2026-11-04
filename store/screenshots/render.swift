// Gera as screenshots da página do app na App Store a partir das capturas do iPhone.
// Uso: swift store/screenshots/render.swift  → store/screenshots/out/<idioma>/<tamanho>/NN-nome.jpg
// Capturas de origem: ~/Downloads/en e ~/Downloads/ptbr (iPhone 1206×2622).
import AppKit

func rgb(_ hex: Int, _ a: CGFloat = 1) -> NSColor {
  NSColor(srgbRed: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255,
          blue: CGFloat(hex & 255) / 255, alpha: a)
}

enum Kind { case phone, widget }

struct Shot {
  let slug: String
  let file: String
  let title: String
  let subtitle: String
  var kind: Kind = .phone
}

let home = FileManager.default.homeDirectoryForCurrentUser.path

// Ordem segue a skill de ASO: 1ª = recurso mais visual (prévia ao vivo no Estúdio), UI real,
// keywords nas legendas ("batch rename", "rename files", "photos").
let shots: [String: (dir: String, list: [Shot])] = [
  "en": ("\(home)/Downloads/en", [
    Shot(slug: "studio", file: "IMG_9025.PNG", title: "Batch rename files", subtitle: "Live preview of every new name"),
    Shot(slug: "review", file: "IMG_9026.PNG", title: "Check before you rename", subtitle: "Conflicts caught. Undo anytime."),
    Shot(slug: "rules", file: "IMG_9030.PNG", title: "Combine powerful rules", subtitle: "Date, numbering, regex and more"),
    Shot(slug: "presets", file: "IMG_9028.PNG", title: "Presets for every job", subtitle: "Photos by date, trip albums, web-ready"),
    Shot(slug: "widget", file: "IMG_9019.PNG", title: "Rename from your Home Screen", subtitle: "Photos, Files or Camera in one tap", kind: .widget),
    Shot(slug: "files", file: "IMG_9027.PNG", title: "Rename folders in Files", subtitle: "Right where your files already live"),
    Shot(slug: "settings", file: "IMG_9031.PNG", title: "Smart, safe options", subtitle: "File pairs stay together. Dark mode too."),
  ]),
  "pt": ("\(home)/Downloads/ptbr", [
    Shot(slug: "estudio", file: "IMG_9032.PNG", title: "Renomeie arquivos em lote", subtitle: "Prévia ao vivo de cada nome novo"),
    Shot(slug: "revisar", file: "IMG_9033.PNG", title: "Revise antes de renomear", subtitle: "Conflitos detectados. Desfaça quando quiser."),
    Shot(slug: "regras", file: "IMG_9034.PNG", title: "Combine regras poderosas", subtitle: "Data, numeração, regex e mais"),
    Shot(slug: "widget", file: "IMG_9018.PNG", title: "Renomeie da Tela de Início", subtitle: "Fotos, Arquivos ou Câmera em um toque", kind: .widget),
    Shot(slug: "ajustes", file: "IMG_9036.PNG", title: "Ajustes inteligentes", subtitle: "Pares de arquivos juntos e modo escuro"),
  ]),
]

// iPhone 6,9" (obrigatório) e 6,5" (opcional; a Apple reduz as de 6,9" se faltar).
let sizes: [(name: String, w: Int, h: Int, pad: Bool)] = [
  ("6.9in-1320x2868", 1320, 2868, false),
  ("6.5in-1284x2778", 1284, 2778, false),
  // iPhone com Dynamic Island, tela média (6,1"/6,3"): o App Store Connect pede este tamanho.
  ("6.3in-1206x2622", 1206, 2622, false),
  // iPad 13" (obrigatório porque o app roda em iPad). Capturas do simulador iPad Pro 13" em ipad-src/<idioma>/<slug>.png
  ("ipad-13in-2064x2752", 2064, 2752, true),
]
let padSrc = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("ipad-src").path

// MARK: - Desenho

func roundedPath(_ r: CGRect, _ radius: CGFloat) -> CGPath {
  CGPath(roundedRect: r, cornerWidth: radius, cornerHeight: radius, transform: nil)
}

func background(_ ctx: CGContext, _ w: CGFloat, _ h: CGFloat) {
  let cs = CGColorSpace(name: CGColorSpace.sRGB)!
  let lin = CGGradient(colorsSpace: cs, colors: [rgb(0xE4561C).cgColor, rgb(0xB5380A).cgColor] as CFArray, locations: [0, 1])!
  ctx.drawLinearGradient(lin, start: .zero, end: CGPoint(x: 0, y: h), options: [])
  let glow = CGGradient(colorsSpace: cs, colors: [rgb(0xFF8A4C, 0.4).cgColor, rgb(0xFF8A4C, 0).cgColor] as CFArray, locations: [0, 1])!
  ctx.drawRadialGradient(glow, startCenter: CGPoint(x: w / 2, y: h * 0.42), startRadius: 0,
                         endCenter: CGPoint(x: w / 2, y: h * 0.42), endRadius: h * 0.55, options: [])
}

/// Texto centralizado com quebra de linha; devolve a altura usada.
@discardableResult
func paragraph(_ s: String, font: NSFont, color: NSColor, rect: CGRect, lineHeight: CGFloat) -> CGFloat {
  let p = NSMutableParagraphStyle()
  p.alignment = .center
  p.minimumLineHeight = lineHeight
  p.maximumLineHeight = lineHeight
  let a = NSAttributedString(string: s, attributes: [.font: font, .foregroundColor: color, .paragraphStyle: p, .kern: -0.5])
  let bounds = a.boundingRect(with: CGSize(width: rect.width, height: 10_000), options: [.usesLineFragmentOrigin])
  a.draw(with: CGRect(x: rect.minX, y: rect.minY, width: rect.width, height: bounds.height + 4), options: [.usesLineFragmentOrigin])
  return bounds.height
}

func drawImage(_ ctx: CGContext, _ img: CGImage, in rect: CGRect) {
  // contexto está invertido (origem em cima); desinverte só para a imagem
  ctx.saveGState()
  ctx.translateBy(x: rect.minX, y: rect.maxY)
  ctx.scaleBy(x: 1, y: -1)
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: rect.width, height: rect.height))
  ctx.restoreGState()
}

func phone(_ ctx: CGContext, _ img: CGImage, top: CGFloat, centerX: CGFloat, maxHeight: CGFloat, s: CGFloat, pad: Bool) {
  let bezel = (pad ? 30 : 26) * s
  let outerR = (pad ? 74 : 150) * s, screenR = (pad ? 48 : 126) * s
  let aspect = CGFloat(img.height) / CGFloat(img.width)
  var screenW = (pad ? 1640 / 1.2 : 1010) * s
  if screenW * aspect + bezel * 2 > maxHeight { screenW = (maxHeight - bezel * 2) / aspect }
  let screen = CGRect(x: centerX - screenW / 2, y: top + bezel, width: screenW, height: screenW * aspect)
  let body = screen.insetBy(dx: -bezel, dy: -bezel)

  ctx.saveGState()
  ctx.setShadow(offset: CGSize(width: 0, height: 40 * s), blur: 110 * s, color: rgb(0x4A1400, 0.5).cgColor)
  ctx.addPath(roundedPath(body, outerR)); ctx.setFillColor(rgb(0x121214).cgColor); ctx.fillPath()
  ctx.restoreGState()
  // aro claro sutil
  ctx.addPath(roundedPath(body.insetBy(dx: 3 * s, dy: 3 * s), outerR - 3 * s))
  ctx.setStrokeColor(rgb(0xFFFFFF, 0.14).cgColor); ctx.setLineWidth(4 * s); ctx.strokePath()

  ctx.saveGState()
  ctx.addPath(roundedPath(screen, screenR)); ctx.clip()
  drawImage(ctx, img, in: screen)
  ctx.restoreGState()
}

/// Recorta os widgets do Lote da tela de início (sem ícones de outros apps) e amplia.
func widgets(_ ctx: CGContext, _ img: CGImage, top: CGFloat, W: CGFloat, H: CGFloat, s: CGFloat) {
  // coordenadas na captura 1206×2622
  let large = CGRect(x: 66, y: 272, width: 1074, height: 504)
  let small = CGRect(x: 66, y: 839, width: 504, height: 504)
  let radius: CGFloat = 76

  func place(_ src: CGRect, _ dst: CGRect) {
    guard let crop = img.cropping(to: src) else { return }
    let k = dst.width / src.width
    ctx.saveGState()
    ctx.setShadow(offset: CGSize(width: 0, height: 34 * s), blur: 90 * s, color: rgb(0x4A1400, 0.5).cgColor)
    ctx.addPath(roundedPath(dst, radius * k)); ctx.setFillColor(rgb(0x2A2A2C).cgColor); ctx.fillPath()
    ctx.restoreGState()
    ctx.saveGState()
    ctx.addPath(roundedPath(dst, radius * k)); ctx.clip()
    drawImage(ctx, crop, in: dst)
    ctx.restoreGState()
  }

  let margin = max(90 * s, (W - 1500 * s) / 2)
  let gap = 80 * s
  let lw = W - margin * 2
  let lh = lw * large.height / large.width
  let sw = lw * 0.56
  let total = lh + gap + sw
  let y = top + max(0, (H - top - 120 * s - total) / 2)
  place(large, CGRect(x: margin, y: y, width: lw, height: lh))
  place(small, CGRect(x: (W - sw) / 2, y: y + lh + gap, width: sw, height: sw))
}

func render(_ shot: Shot, path: String, W: Int, H: Int, pad: Bool, to url: URL) {
  guard let ns = NSImage(contentsOfFile: path),
        let img = ns.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("✗ não achei \(path)"); return
  }
  let w = CGFloat(W), h = CGFloat(H), s = pad ? w / 1320 / 1.2 : w / 1320
  let cs = CGColorSpace(name: CGColorSpace.sRGB)!
  let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0, space: cs,
                      bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
  ctx.translateBy(x: 0, y: h); ctx.scaleBy(x: 1, y: -1)
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: true)

  background(ctx, w, h)
  let textRect = CGRect(x: 80 * s, y: 150 * s, width: w - 160 * s, height: 400 * s)
  let th = paragraph(shot.title, font: .systemFont(ofSize: 112 * s, weight: .bold), color: .white, rect: textRect, lineHeight: 124 * s)
  let subTop = textRect.minY + th + 26 * s
  let sh = paragraph(shot.subtitle, font: .systemFont(ofSize: 58 * s, weight: .medium), color: rgb(0xFFFFFF, 0.86),
                     rect: CGRect(x: textRect.minX, y: subTop, width: textRect.width, height: 200), lineHeight: 70 * s)
  let contentTop = subTop + sh + 90 * s

  switch shot.kind {
  case .phone: phone(ctx, img, top: contentTop, centerX: w / 2, maxHeight: h - contentTop - 80 * s, s: s, pad: pad)
  case .widget: widgets(ctx, img, top: contentTop, W: w, H: h, s: s)
  }

  NSGraphicsContext.restoreGraphicsState()
  let data = NSBitmapImageRep(cgImage: ctx.makeImage()!).representation(using: .jpeg, properties: [.compressionFactor: 0.93])!
  try! data.write(to: url)
}

let out = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("out")
try? FileManager.default.removeItem(at: out)
for (lang, set) in shots {
  for size in sizes {
    let folder = out.appendingPathComponent(lang).appendingPathComponent(size.name)
    try! FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    // iPad: só entram as telas capturadas no simulador (Arquivos fica vazio no iPad e foi deixado de fora)
    let list = size.pad ? set.list.filter { $0.kind == .widget || FileManager.default.fileExists(atPath: "\(padSrc)/\(lang)/\($0.slug).png") } : set.list
    for (i, shot) in list.enumerated() {
      let path = size.pad && shot.kind == .phone ? "\(padSrc)/\(lang)/\(shot.slug).png" : "\(set.dir)/\(shot.file)"
      render(shot, path: path, W: size.w, H: size.h, pad: size.pad,
             to: folder.appendingPathComponent(String(format: "%02d-%@.jpg", i + 1, shot.slug)))
    }
    print("✓ \(lang) \(size.name): \(list.count)")
  }
}
