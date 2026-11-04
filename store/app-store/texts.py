# Metadados da App Store do Lote, por locale.
# Rode `python3 store/app-store/texts.py` para validar limites e gerar metadata.json.
import json, pathlib, sys

EULA = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"

DESC = {}

DESC["en"] = f"""Rename hundreds of photos, videos and documents at once, right on your iPhone or iPad. Lote shows a live preview of every new name before anything changes, so you always know exactly what will happen.

BUILT FOR REAL BATCHES
• Live preview of each file, with the changed part highlighted
• 13 combinable rules: new name template, find & replace (with regex), insert, remove, upper/lower case, numbering, date, leading zeros, clean up, length limit, extension, swap parts and sort into folders
• Variables and filters: {{taken:YYYY-MM-DD}}_{{folder|upper}}_{{n:3}}
• Date taken from EXIF, creation or modification date
• Natural sorting (photo 2 comes before photo 10), by date, size or type
• Conflict detection: add "(2)", skip or stop
• Safe renaming: swaps, chains and case-only changes just work

UNDO ANYTHING
Every batch goes to History. Changed your mind? Undo the whole batch in one tap, including the folders it created.

YOUR FILES, YOUR WAY
• Import from Photos, the Files app, the camera or the Share sheet
• Rename a folder in place, with or without subfolders
• Built-in library with folders, multi-select and Quick Look
• Export: share (many files become a ZIP), copy to any folder (iCloud Drive, Google Drive) or save to Photos

PRESETS
10 ready-made presets such as Photos by date, Web ready, Clean screenshots, Remove "(1)" and Sort by year/month. Save your own, mark favorites, share and import them.

ALWAYS ONE TAP AWAY
Home Screen and Lock Screen widgets, a Control Center control, Action button support and quick actions on the app icon.

PRIVATE BY DESIGN
No account. Your files never leave your device.

LOTE PRO
Lote is free to download and try. Lote Pro unlocks unlimited batches and every advanced feature. Choose a monthly or yearly subscription (the yearly plan includes a free trial) or a one-time lifetime purchase.

Payment is charged to your Apple Account at confirmation of purchase. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel anytime in your Apple Account settings.

Terms of Use: {EULA}"""

DESC["pt-BR"] = f"""Renomeie centenas de fotos, vídeos e documentos de uma vez, direto no iPhone ou iPad. O Lote mostra a prévia ao vivo de cada novo nome antes de mudar qualquer coisa, então você sempre sabe exatamente o que vai acontecer.

FEITO PARA LOTES DE VERDADE
• Prévia ao vivo de cada arquivo, com o trecho alterado destacado
• 13 regras combináveis: novo nome (modelo), substituir (com regex), inserir, remover, maiúsculas/minúsculas, numeração, data, zeros à esquerda, limpar, limitar tamanho, extensão, inverter partes e organizar em pastas
• Variáveis e filtros: {{taken:YYYY-MM-DD}}_{{folder|upper}}_{{n:3}}
• Data de captura do EXIF, de criação ou de modificação
• Ordenação natural (foto 2 vem antes de foto 10), por data, tamanho ou tipo
• Detecção de conflitos: adicionar "(2)", pular ou parar
• Renomeação segura: trocas de nome, cadeias e mudanças só de maiúsculas funcionam

DESFAÇA QUALQUER LOTE
Todo lote vai para o Histórico. Mudou de ideia? Desfaça o lote inteiro com um toque, inclusive as pastas criadas.

SEUS ARQUIVOS, DO SEU JEITO
• Importe das Fotos, do app Arquivos, da câmera ou pelo Compartilhar
• Renomeie uma pasta no lugar, com ou sem subpastas
• Biblioteca própria com pastas, seleção múltipla e Visualização Rápida
• Exporte: compartilhe (vários arquivos viram um ZIP), copie para qualquer pasta (iCloud Drive, Google Drive) ou salve nas Fotos

PRESETS
10 presets prontos, como Fotos por data, Pronto para web, Limpar capturas de tela, Remover "(1)" e Organizar por ano/mês. Salve os seus, favorite, compartilhe e importe.

SEMPRE A UM TOQUE
Widgets na Tela de Início e na Tela Bloqueada, controle na Central de Controle, botão de Ação e atalhos no ícone do app.

PRIVADO DE VERDADE
Sem conta. Seus arquivos nunca saem do aparelho.

LOTE PRO
O Lote é gratuito para baixar e experimentar. O Lote Pro libera lotes ilimitados e todos os recursos avançados. Escolha a assinatura mensal ou anual (o plano anual tem teste grátis) ou a compra única vitalícia.

O pagamento é cobrado na sua Conta Apple na confirmação da compra. A assinatura renova automaticamente, a menos que seja cancelada pelo menos 24 horas antes do fim do período atual. Gerencie ou cancele quando quiser nos ajustes da sua Conta Apple.

Termos de Uso: {EULA}"""

DESC["pt-PT"] = f"""Mude o nome a centenas de fotos, vídeos e documentos de uma só vez, diretamente no iPhone ou iPad. O Lote mostra a pré-visualização ao vivo de cada novo nome antes de alterar o que quer que seja, para saber sempre exatamente o que vai acontecer.

FEITO PARA LOTES A SÉRIO
• Pré-visualização ao vivo de cada ficheiro, com a parte alterada em destaque
• 13 regras combináveis: novo nome (modelo), substituir (com regex), inserir, remover, maiúsculas/minúsculas, numeração, data, zeros à esquerda, limpar, limitar comprimento, extensão, inverter partes e organizar em pastas
• Variáveis e filtros: {{taken:YYYY-MM-DD}}_{{folder|upper}}_{{n:3}}
• Data de captura do EXIF, de criação ou de modificação
• Ordenação natural (foto 2 vem antes de foto 10), por data, tamanho ou tipo
• Deteção de conflitos: acrescentar "(2)", ignorar ou parar
• Renomeação segura: trocas de nomes, cadeias e alterações só de maiúsculas funcionam

ANULE QUALQUER LOTE
Cada lote fica no Histórico. Mudou de ideias? Anule o lote inteiro com um toque, incluindo as pastas criadas.

OS SEUS FICHEIROS, À SUA MANEIRA
• Importe das Fotos, da app Ficheiros, da câmara ou através de Partilhar
• Mude o nome a uma pasta no próprio local, com ou sem subpastas
• Biblioteca própria com pastas, seleção múltipla e Visualização rápida
• Exporte: partilhe (vários ficheiros tornam-se um ZIP), copie para qualquer pasta (iCloud Drive, Google Drive) ou guarde nas Fotos

PREDEFINIÇÕES
10 predefinições prontas, como Fotos por data, Pronto para a web, Limpar capturas de ecrã, Remover "(1)" e Organizar por ano/mês. Guarde as suas, marque favoritas, partilhe e importe.

SEMPRE À DISTÂNCIA DE UM TOQUE
Widgets no ecrã principal e no ecrã bloqueado, controlo na central de controlo, botão de ação e ações rápidas no ícone da app.

PRIVADO DE RAIZ
Sem conta. Os seus ficheiros nunca saem do dispositivo.

LOTE PRO
O Lote é gratuito para descarregar e experimentar. O Lote Pro desbloqueia lotes ilimitados e todas as funcionalidades avançadas. Escolha uma subscrição mensal ou anual (o plano anual inclui um período experimental gratuito) ou uma compra única vitalícia.

O pagamento é debitado na sua Conta Apple na confirmação da compra. A subscrição é renovada automaticamente, exceto se for cancelada pelo menos 24 horas antes do fim do período atual. Faça a gestão ou cancele quando quiser nas definições da sua Conta Apple.

Termos de Utilização: {EULA}"""

DESC["es"] = f"""Renombra cientos de fotos, vídeos y documentos a la vez, directamente en tu iPhone o iPad. Lote muestra una vista previa en vivo de cada nombre nuevo antes de cambiar nada, para que siempre sepas exactamente qué va a pasar.

HECHO PARA LOTES DE VERDAD
• Vista previa en vivo de cada archivo, con la parte cambiada resaltada
• 13 reglas combinables: nuevo nombre (plantilla), reemplazar (con regex), insertar, quitar, mayúsculas/minúsculas, numeración, fecha, ceros a la izquierda, limpiar, limitar longitud, extensión, invertir partes y organizar en carpetas
• Variables y filtros: {{taken:YYYY-MM-DD}}_{{folder|upper}}_{{n:3}}
• Fecha de captura del EXIF, de creación o de modificación
• Orden natural (foto 2 va antes que foto 10), por fecha, tamaño o tipo
• Detección de conflictos: añadir "(2)", omitir o detener
• Renombrado seguro: intercambios, cadenas y cambios solo de mayúsculas funcionan

DESHAZ CUALQUIER LOTE
Cada lote queda en el Historial. ¿Cambiaste de idea? Deshaz el lote entero con un toque, incluidas las carpetas creadas.

TUS ARCHIVOS, A TU MANERA
• Importa desde Fotos, la app Archivos, la cámara o el menú Compartir
• Renombra una carpeta en su lugar, con o sin subcarpetas
• Biblioteca propia con carpetas, selección múltiple y Vista Rápida
• Exporta: comparte (varios archivos se convierten en un ZIP), copia a cualquier carpeta (iCloud Drive, Google Drive) o guarda en Fotos

PRESETS
10 presets listos, como Fotos por fecha, Listo para web, Limpiar capturas de pantalla, Quitar "(1)" y Organizar por año/mes. Guarda los tuyos, márcalos como favoritos, compártelos e impórtalos.

SIEMPRE A UN TOQUE
Widgets en la pantalla de inicio y en la pantalla bloqueada, control en el Centro de control, botón de Acción y accesos rápidos en el icono de la app.

PRIVADO DE VERDAD
Sin cuenta. Tus archivos nunca salen de tu dispositivo.

LOTE PRO
Lote es gratis para descargar y probar. Lote Pro desbloquea lotes ilimitados y todas las funciones avanzadas. Elige una suscripción mensual o anual (el plan anual incluye prueba gratuita) o una compra única de por vida.

El pago se carga a tu Cuenta de Apple al confirmar la compra. La suscripción se renueva automáticamente salvo que se cancele al menos 24 horas antes del final del periodo actual. Gestiona o cancela cuando quieras en los ajustes de tu Cuenta de Apple.

Condiciones de uso: {EULA}"""

DESC["fr"] = f"""Renommez des centaines de photos, vidéos et documents d'un coup, directement sur votre iPhone ou iPad. Lote affiche un aperçu en direct de chaque nouveau nom avant toute modification : vous savez toujours exactement ce qui va se passer.

PENSÉ POUR DE VRAIS LOTS
• Aperçu en direct de chaque fichier, avec la partie modifiée en surbrillance
• 13 règles combinables : nouveau nom (modèle), rechercher et remplacer (avec regex), insérer, supprimer, majuscules/minuscules, numérotation, date, zéros initiaux, nettoyer, limiter la longueur, extension, inverser des parties et ranger dans des dossiers
• Variables et filtres : {{taken:YYYY-MM-DD}}_{{folder|upper}}_{{n:3}}
• Date de prise de vue EXIF, de création ou de modification
• Tri naturel (photo 2 avant photo 10), par date, taille ou type
• Détection des conflits : ajouter « (2) », ignorer ou arrêter
• Renommage sûr : échanges de noms, chaînes et changements de casse fonctionnent

ANNULEZ N'IMPORTE QUEL LOT
Chaque lot est enregistré dans l'Historique. Vous changez d'avis ? Annulez tout le lot d'un toucher, y compris les dossiers créés.

VOS FICHIERS, À VOTRE FAÇON
• Importez depuis Photos, l'app Fichiers, l'appareil photo ou le menu Partager
• Renommez un dossier sur place, avec ou sans sous-dossiers
• Bibliothèque intégrée avec dossiers, sélection multiple et Coup d'œil
• Exportez : partagez (plusieurs fichiers deviennent un ZIP), copiez vers n'importe quel dossier (iCloud Drive, Google Drive) ou enregistrez dans Photos

PRÉRÉGLAGES
10 préréglages prêts à l'emploi, comme Photos par date, Prêt pour le web, Nettoyer les captures d'écran, Supprimer « (1) » et Ranger par année/mois. Créez les vôtres, mettez-les en favoris, partagez-les et importez-les.

TOUJOURS À PORTÉE DE MAIN
Widgets sur l'écran d'accueil et l'écran verrouillé, commande dans le Centre de contrôle, bouton Action et actions rapides sur l'icône de l'app.

PRIVÉ PAR CONCEPTION
Aucun compte. Vos fichiers ne quittent jamais votre appareil.

LOTE PRO
Lote est gratuit à télécharger et à essayer. Lote Pro débloque les lots illimités et toutes les fonctions avancées. Choisissez un abonnement mensuel ou annuel (l'offre annuelle inclut un essai gratuit) ou un achat unique à vie.

Le paiement est débité de votre compte Apple à la confirmation de l'achat. L'abonnement se renouvelle automatiquement sauf s'il est annulé au moins 24 heures avant la fin de la période en cours. Gérez-le ou annulez-le à tout moment dans les réglages de votre compte Apple.

Conditions d'utilisation : {EULA}"""

DESC["de"] = f"""Benenne Hunderte Fotos, Videos und Dokumente auf einmal um, direkt auf deinem iPhone oder iPad. Lote zeigt eine Live-Vorschau jedes neuen Namens, bevor sich irgendetwas ändert. So weißt du immer genau, was passiert.

FÜR ECHTE STAPEL GEMACHT
• Live-Vorschau jeder Datei, der geänderte Teil wird hervorgehoben
• 13 kombinierbare Regeln: neuer Name (Vorlage), Suchen und Ersetzen (mit Regex), Einfügen, Entfernen, Groß-/Kleinschreibung, Nummerierung, Datum, führende Nullen, Bereinigen, Länge begrenzen, Dateiendung, Teile tauschen und in Ordner sortieren
• Variablen und Filter: {{taken:YYYY-MM-DD}}_{{folder|upper}}_{{n:3}}
• Aufnahmedatum aus EXIF, Erstellungs- oder Änderungsdatum
• Natürliche Sortierung (Foto 2 vor Foto 10), nach Datum, Größe oder Typ
• Konflikterkennung: „(2)“ anhängen, überspringen oder abbrechen
• Sicheres Umbenennen: Tauschen, Ketten und reine Groß-/Kleinschreibungsänderungen funktionieren

JEDEN STAPEL RÜCKGÄNGIG MACHEN
Jeder Stapel landet im Verlauf. Anders überlegt? Mach den ganzen Stapel mit einem Tippen rückgängig, inklusive der erstellten Ordner.

DEINE DATEIEN, DEIN WEG
• Import aus Fotos, der Dateien-App, der Kamera oder über das Teilen-Menü
• Einen Ordner direkt umbenennen, mit oder ohne Unterordner
• Eigene Mediathek mit Ordnern, Mehrfachauswahl und Übersicht
• Export: teilen (mehrere Dateien werden zu einem ZIP), in einen beliebigen Ordner kopieren (iCloud Drive, Google Drive) oder in Fotos sichern

VORLAGEN
10 fertige Vorlagen wie Fotos nach Datum, Fürs Web, Bildschirmfotos aufräumen, „(1)“ entfernen und Nach Jahr/Monat sortieren. Eigene speichern, favorisieren, teilen und importieren.

IMMER NUR EIN TIPPEN ENTFERNT
Widgets auf dem Home- und Sperrbildschirm, eine Steuerung im Kontrollzentrum, Aktionstaste und Schnellaktionen am App-Symbol.

PRIVAT VON GRUND AUF
Kein Konto. Deine Dateien verlassen nie dein Gerät.

LOTE PRO
Lote ist kostenlos zum Laden und Ausprobieren. Lote Pro schaltet unbegrenzte Stapel und alle erweiterten Funktionen frei. Wähle ein Monats- oder Jahresabo (das Jahresabo enthält eine kostenlose Testphase) oder einen einmaligen Kauf auf Lebenszeit.

Die Zahlung wird bei Kaufbestätigung über deinen Apple Account abgerechnet. Das Abo verlängert sich automatisch, sofern es nicht mindestens 24 Stunden vor Ende des laufenden Zeitraums gekündigt wird. Verwalte oder kündige es jederzeit in den Einstellungen deines Apple Accounts.

Nutzungsbedingungen: {EULA}"""

PROMO = {
    "en": "Rename hundreds of photos, videos and documents in seconds. Live preview, 13 combinable rules, EXIF dates and one-tap undo. Your files never leave your device.",
    "pt-BR": "Renomeie centenas de fotos, vídeos e documentos em segundos. Prévia ao vivo, 13 regras combináveis, data do EXIF e desfazer com um toque. Tudo fica no seu aparelho.",
    "pt-PT": "Mude o nome a centenas de fotos, vídeos e documentos em segundos. Pré-visualização ao vivo, 13 regras, data EXIF e anular com um toque. Tudo fica no seu aparelho.",
    "es": "Renombra cientos de fotos, vídeos y documentos en segundos. Vista previa en vivo, 13 reglas combinables, fecha EXIF y deshacer con un toque. Todo queda en tu dispositivo.",
    "fr": "Renommez des centaines de photos, vidéos et documents en quelques secondes. Aperçu en direct, 13 règles, dates EXIF et annulation d'un toucher. Tout reste sur l'appareil.",
    "de": "Benenne Hunderte Fotos, Videos und Dokumente in Sekunden um. Live-Vorschau, 13 kombinierbare Regeln, EXIF-Datum und Rückgängig per Tippen. Alles bleibt auf dem Gerät.",
}

# name, subtitle, keywords (sem repetir palavras entre os campos)
LOCALES = {
    "en-US": ("en", "Batch Rename Files - Lote", "Bulk edit photo & PDF names",
              "renamer,mass,exif,date,numbering,organize,folder,extension,image,video,document,prefix,regex,suffix"),
    "en-GB": ("en", "Batch Rename Files - Lote", "Bulk edit photo & PDF names",
              "renamer,mass,exif,date,numbering,organise,folder,extension,image,video,document,prefix,sequence"),
    "en-AU": ("en", "Batch Rename Files - Lote", "Bulk edit photo & PDF names",
              "renamer,mass,multiple,exif,date,numbering,organise,folder,extension,picture,video,document,prefix"),
    "en-CA": ("en", "Batch Rename Files - Lote", "Bulk edit photo & PDF names",
              "renamer,mass,exif,date,numbering,organize,folder,extension,image,video,document,prefix,regex,suffix"),
    "pt-BR": ("pt-BR", "Renomear Arquivos em Lote", "Mude o nome de fotos e PDF",
              "renomeador,massa,vários,exif,data,numeração,organizar,pasta,extensão,imagem,vídeo,documento,trocar"),
    "pt-PT": ("pt-PT", "Renomear Ficheiros em Lote", "Mude o nome de fotos e PDF",
              "renomeador,massa,vários,exif,data,numeração,organizar,pasta,extensão,imagem,vídeo,documento,arquivo"),
    "es-ES": ("es", "Renombrar Archivos - Lote", "Cambia nombre de fotos y PDF",
              "renombrador,masivo,varios,exif,fecha,numeración,organizar,carpeta,extensión,imagen,vídeo,documento"),
    "es-MX": ("es", "Renombrar Archivos - Lote", "Cambia nombre de fotos y PDF",
              "renombrador,masivo,varios,exif,fecha,numerar,consecutivo,carpeta,extension,imagen,video,documento"),
    "fr-FR": ("fr", "Renommer Fichiers - Lote", "Changer le nom photos et PDF",
              "renommage,masse,lot,plusieurs,exif,date,numérotation,dossier,extension,image,vidéo,document,préfixe"),
    "fr-CA": ("fr", "Renommer Fichiers - Lote", "Changer le nom photos et PDF",
              "renommage,masse,lot,plusieurs,exif,date,numérotation,dossier,extension,image,vidéo,document,trier"),
    "de-DE": ("de", "Dateien Umbenennen - Lote", "Stapel-Umbenennung für Fotos",
              "massenumbenennung,umbenenner,mehrere,exif,datum,nummerierung,ordner,dateiendung,bild,video,dokument"),
}

out, errors = {}, []
for loc, (lang, name, sub, kw) in LOCALES.items():
    promo = PROMO.get(lang) or PROMO[lang.split("-")[0]]
    desc = DESC[lang]
    words = set((name + " " + sub).lower().replace("-", " ").replace("&", " ").split())
    for k in kw.split(","):
        if k in words:
            errors.append(f"{loc}: keyword '{k}' repete nome/subtítulo")
    if len(kw.split(",")) != len(set(kw.split(","))):
        errors.append(f"{loc}: keyword duplicada")
    for label, val, lim in (("name", name, 30), ("subtitle", sub, 30), ("keywords", kw, 100), ("promo", promo, 170), ("description", desc, 4000)):
        if len(val) > lim:
            errors.append(f"{loc}: {label} tem {len(val)} > {lim}")
    print(f"{loc:6} name={len(name):2} sub={len(sub):2} kw={len(kw):3} promo={len(promo):3} desc={len(desc)}")
    out[loc] = {"name": name, "subtitle": sub, "keywords": kw, "promotionalText": promo, "description": desc}

pathlib.Path(__file__).with_name("metadata.json").write_text(json.dumps(out, ensure_ascii=False, indent=2))
if errors:
    print("\n".join(errors)); sys.exit(1)
print("OK")
