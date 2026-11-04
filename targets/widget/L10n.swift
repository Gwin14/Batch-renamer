import Foundation

/// Widget strings in the app's languages. The app writes its resolved language ("pt", "en"…)
/// to the App Group, so widgets follow the in-app choice, including the automatic mode.
enum L10n {
  enum Key {
    case renamed, filesRenamed, last, preset, photos, files, camera, tapToRename, photosByDate
    case homeDescription, lockName, lockDescription, unlockPro, unlockShort
  }

  static let supported = ["pt", "en", "es", "fr", "de"]

  /// App language from the App Group; before the app's first sync, the device language.
  static var lang: String {
    if let saved = UserDefaults(suiteName: LoteEntry.appGroup)?.string(forKey: "lang"), supported.contains(saved) {
      return saved
    }
    for id in Locale.preferredLanguages {
      let code = String(id.prefix(2))
      if supported.contains(code) { return code }
    }
    return "en"
  }

  static var locale: Locale {
    Locale(identifier: ["pt": "pt_BR", "en": "en_US", "es": "es_ES", "fr": "fr_FR", "de": "de_DE"][lang] ?? "en_US")
  }

  static func t(_ key: Key) -> String {
    let row = table[key] ?? [:]
    return row[lang] ?? row["en"] ?? ""
  }

  /// Replaces %1, %2… with the arguments, in order.
  static func t(_ key: Key, _ args: CustomStringConvertible...) -> String {
    var text = t(key)
    for (i, arg) in args.enumerated() {
      text = text.replacingOccurrences(of: "%\(i + 1)", with: arg.description)
    }
    return text
  }

  private static let table: [Key: [String: String]] = [
    .renamed: ["pt": "renomeados", "en": "renamed", "es": "renombrados", "fr": "renommés", "de": "umbenannt"],
    .filesRenamed: ["pt": "arquivos renomeados", "en": "files renamed", "es": "archivos renombrados", "fr": "fichiers renommés", "de": "Dateien umbenannt"],
    .last: ["pt": "Último: %1", "en": "Last: %1", "es": "Último: %1", "fr": "Dernier : %1", "de": "Zuletzt: %1"],
    .preset: ["pt": "Preset: %1", "en": "Preset: %1", "es": "Preset: %1", "fr": "Préréglage : %1", "de": "Vorlage: %1"],
    .photos: ["pt": "Fotos", "en": "Photos", "es": "Fotos", "fr": "Photos", "de": "Fotos"],
    .files: ["pt": "Arquivos", "en": "Files", "es": "Archivos", "fr": "Fichiers", "de": "Dateien"],
    .camera: ["pt": "Câmera", "en": "Camera", "es": "Cámara", "fr": "Appareil", "de": "Kamera"],
    .tapToRename: ["pt": "Toque para renomear fotos", "en": "Tap to rename photos", "es": "Toca para renombrar fotos", "fr": "Touchez pour renommer des photos", "de": "Tippen, um Fotos umzubenennen"],
    .photosByDate: ["pt": "Fotos por data", "en": "Photos by date", "es": "Fotos por fecha", "fr": "Photos par date", "de": "Fotos nach Datum"],
    .homeDescription: [
      "pt": "Total renomeado e atalhos para renomear fotos, arquivos ou tirar uma foto já nomeada.",
      "en": "Total renamed and shortcuts to rename photos, files or take a pre-named photo.",
      "es": "Total renombrado y atajos para renombrar fotos, archivos o tomar una foto ya nombrada.",
      "fr": "Total renommé et raccourcis pour renommer photos, fichiers ou prendre une photo déjà nommée.",
      "de": "Gesamtzahl umbenannter Dateien und Kurzbefehle für Fotos, Dateien oder ein Foto mit fertigem Namen.",
    ],
.unlockPro: [
      "pt": "Toque para desbloquear com o Lote Pro", "en": "Tap to unlock with Lote Pro", "es": "Toca para desbloquear con Lote Pro",
      "fr": "Touchez pour débloquer avec Lote Pro", "de": "Tippen, um mit Lote Pro freizuschalten",
    ],
    .unlockShort: ["pt": "Desbloquear o Lote Pro", "en": "Unlock Lote Pro", "es": "Desbloquear Lote Pro", "fr": "Débloquer Lote Pro", "de": "Lote Pro freischalten"],
    .lockName: ["pt": "Lote — Tela Bloqueada", "en": "Lote — Lock Screen", "es": "Lote — Pantalla bloqueada", "fr": "Lote — Écran verrouillé", "de": "Lote – Sperrbildschirm"],
    .lockDescription: [
      "pt": "Abra a renomeação de fotos direto da Tela Bloqueada.",
      "en": "Start renaming photos right from the Lock Screen.",
      "es": "Abre el renombrado de fotos directamente desde la pantalla bloqueada.",
      "fr": "Lancez le renommage de photos depuis l’écran verrouillé.",
      "de": "Starte das Umbenennen von Fotos direkt vom Sperrbildschirm.",
    ],
  ]
}
