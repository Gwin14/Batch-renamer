import SwiftUI
import WidgetKit

/// Lock Screen (and StandBy / watch-style) accessory widgets.
struct LoteLockScreenView: View {
  @Environment(\.widgetFamily) private var family
  let entry: LoteEntry

  var body: some View {
    Group {
      if !entry.isPro {
        locked
      } else {
        unlocked
      }
    }
    .containerBackground(for: .widget) { Color.clear }
    .widgetURL(entry.isPro ? LoteLinks.photos : LoteLinks.pro)
  }

  @ViewBuilder private var locked: some View {
    switch family {
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        Image(systemName: "lock.fill").font(.system(size: 18, weight: .semibold))
      }
      .widgetAccentable()
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 1) {
        Label("Lote Pro", systemImage: "lock.fill").font(.headline).widgetAccentable()
        Text(L10n.t(.unlockPro)).font(.caption).lineLimit(2)
      }
    default:
      Label(L10n.t(.unlockShort), systemImage: "lock.fill")
    }
  }

  @ViewBuilder private var unlocked: some View {
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
          Text("\(entry.totalRenamed.grouped) \(L10n.t(.renamed))").font(.caption).monospacedDigit()
          Text(entry.lastLabel.isEmpty ? L10n.t(.tapToRename) : L10n.t(.last, entry.lastLabel))
            .font(.caption2).foregroundStyle(.secondary).lineLimit(1)
        }
      default:
        Label("\(entry.totalRenamed.grouped) \(L10n.t(.renamed))", systemImage: "wand.and.rays")
      }
  }

  private func short(_ n: Int) -> String {
    guard n >= 1000 else { return String(n) }
    let f = NumberFormatter()
    f.locale = L10n.locale
    f.maximumFractionDigits = 1
    return (f.string(from: NSNumber(value: Double(n) / 1000)) ?? String(n / 1000)) + "k"
  }
}

struct LoteLockScreenWidget: Widget {
  let kind = "LoteLockScreenWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: LoteProvider()) { entry in
      LoteLockScreenView(entry: entry)
    }
    .configurationDisplayName(L10n.t(.lockName))
    .description(L10n.t(.lockDescription))
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}
