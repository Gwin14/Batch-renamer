import SwiftUI
import WidgetKit

/// Snapshot written by the app through ExtensionStorage (App Group "group.com.fabiosantos.lote").
struct LoteEntry: TimelineEntry {
  let date: Date
  let totalRenamed: Int
  let batches: Int
  let lastLabel: String
  let lastCount: Int
  let lastAt: Date?
  let quickPresetName: String
  let pendingFiles: Int

  static let appGroup = "group.com.fabiosantos.lote"

  static func load() -> LoteEntry {
    let d = UserDefaults(suiteName: appGroup)
    let lastAtMs = d?.double(forKey: "lastAt") ?? 0
    return LoteEntry(
      date: .now,
      totalRenamed: d?.integer(forKey: "totalRenamed") ?? 0,
      batches: d?.integer(forKey: "batches") ?? 0,
      lastLabel: d?.string(forKey: "lastLabel") ?? "",
      lastCount: d?.integer(forKey: "lastCount") ?? 0,
      lastAt: lastAtMs > 0 ? Date(timeIntervalSince1970: lastAtMs / 1000) : nil,
      quickPresetName: d?.string(forKey: "quickPresetName") ?? "Fotos por data",
      pendingFiles: d?.integer(forKey: "pendingFiles") ?? 0
    )
  }

  static let sample = LoteEntry(
    date: .now, totalRenamed: 1284, batches: 37, lastLabel: "Fotos por data", lastCount: 48,
    lastAt: .now.addingTimeInterval(-3600), quickPresetName: "Fotos por data", pendingFiles: 0
  )
}

struct LoteProvider: TimelineProvider {
  func placeholder(in context: Context) -> LoteEntry { .sample }

  func getSnapshot(in context: Context, completion: @escaping (LoteEntry) -> Void) {
    completion(context.isPreview ? .sample : .load())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<LoteEntry>) -> Void) {
    // The app calls reloadAllTimelines() after every batch; this is just a safety refresh.
    completion(Timeline(entries: [.load()], policy: .after(.now.addingTimeInterval(60 * 60))))
  }
}

enum LoteLinks {
  static let photos = URL(string: "lote://quick?action=photos")!
  static let files = URL(string: "lote://quick?action=files")!
  static let camera = URL(string: "lote://quick?action=camera")!
  static let history = URL(string: "lote://history")!
}

extension Int {
  /// 1284 → "1.284" (pt-BR grouping)
  var grouped: String {
    let f = NumberFormatter()
    f.numberStyle = .decimal
    f.locale = Locale(identifier: "pt_BR")
    return f.string(from: NSNumber(value: self)) ?? String(self)
  }
}
