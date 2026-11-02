import SwiftUI
import WidgetKit

/// Lock Screen (and StandBy / watch-style) accessory widgets.
struct LoteLockScreenView: View {
  @Environment(\.widgetFamily) private var family
  let entry: LoteEntry

  var body: some View {
    Group {
      switch family {
      case .accessoryCircular:
        ZStack {
          AccessoryWidgetBackground()
          VStack(spacing: 0) {
            Image(systemName: "wand.and.rays").font(.system(size: 16, weight: .semibold))
            Text(short(entry.totalRenamed)).font(.system(size: 11, weight: .semibold)).monospacedDigit()
          }
        }
        .widgetAccentable()
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 1) {
          Label("Lote", systemImage: "wand.and.rays").font(.headline).widgetAccentable()
          Text("\(entry.totalRenamed.grouped) renomeados").font(.caption).monospacedDigit()
          Text(entry.lastLabel.isEmpty ? "Toque para renomear fotos" : "Último: \(entry.lastLabel)")
            .font(.caption2).foregroundStyle(.secondary).lineLimit(1)
        }
      default:
        Label("\(entry.totalRenamed.grouped) renomeados", systemImage: "wand.and.rays")
      }
    }
    .containerBackground(for: .widget) { Color.clear }
    .widgetURL(LoteLinks.photos)
  }

  private func short(_ n: Int) -> String {
    n >= 1000 ? String(format: "%.1fk", Double(n) / 1000).replacingOccurrences(of: ".", with: ",") : String(n)
  }
}

struct LoteLockScreenWidget: Widget {
  let kind = "LoteLockScreenWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: LoteProvider()) { entry in
      LoteLockScreenView(entry: entry)
    }
    .configurationDisplayName("Lote — Tela Bloqueada")
    .description("Abra a renomeação de fotos direto da Tela Bloqueada.")
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}
