import SwiftUI
import WidgetKit

private let accent = Color("LoteAccent")
private let accentSoft = Color("LoteAccentSoft")

struct ActionPill: View {
  let title: String
  let symbol: String
  let url: URL
  var prominent = false

  var body: some View {
    Link(destination: url) {
      HStack(spacing: 6) {
        Image(systemName: symbol).font(.system(size: 13, weight: .semibold))
        Text(title).font(.system(size: 13, weight: .semibold)).lineLimit(1)
      }
      .frame(maxWidth: .infinity, minHeight: 34)
      .foregroundStyle(prominent ? Color.white : accent)
      .background(prominent ? accent : accentSoft, in: Capsule())
    }
  }
}

/// Free plan: the widget invites to unlock Lote Pro and opens the paywall.
struct LockedHomeView: View {
  @Environment(\.widgetFamily) private var family
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Spacer(minLength: 0)
      Image(systemName: "lock.fill")
        .font(.system(size: family == .systemMedium ? 30 : 26, weight: .semibold))
        .foregroundStyle(accent)
        .frame(maxWidth: .infinity)
      Text(L10n.t(.unlockPro))
        .font(.system(size: family == .systemMedium ? 17 : 15, weight: .semibold))
        .lineLimit(3)
        .minimumScaleFactor(0.8)
        .frame(maxWidth: .infinity, alignment: family == .systemMedium ? .center : .leading)
        .multilineTextAlignment(family == .systemMedium ? .center : .leading)
      Spacer(minLength: 0)
    }
  }
}

struct HomeSmallView: View {
  let entry: LoteEntry
  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(spacing: 6) {
        Image(systemName: "wand.and.rays").font(.system(size: 13, weight: .bold)).foregroundStyle(accent)
        Text("Lote").font(.system(size: 13, weight: .semibold)).foregroundStyle(.secondary)
      }
      Spacer(minLength: 0)
      Text(entry.totalRenamed.grouped)
        .font(.system(size: 30, weight: .bold, design: .rounded))
        .monospacedDigit()
        .minimumScaleFactor(0.6)
        .lineLimit(1)
        .contentTransition(.numericText())
      Text(L10n.t(.renamed)).font(.system(size: 12)).foregroundStyle(.secondary)
      Spacer(minLength: 0)
      ActionPill(title: L10n.t(.photos), symbol: "photo.on.rectangle", url: LoteLinks.photos, prominent: true)
    }
  }
}

struct HomeMediumView: View {
  let entry: LoteEntry
  var body: some View {
    HStack(spacing: 16) {
      VStack(alignment: .leading, spacing: 4) {
        HStack(spacing: 6) {
          Image(systemName: "wand.and.rays").font(.system(size: 13, weight: .bold)).foregroundStyle(accent)
          Text("Lote").font(.system(size: 13, weight: .semibold)).foregroundStyle(.secondary)
        }
        Spacer(minLength: 0)
        Text(entry.totalRenamed.grouped)
          .font(.system(size: 34, weight: .bold, design: .rounded))
          .monospacedDigit()
          .minimumScaleFactor(0.6)
          .lineLimit(1)
        Text(L10n.t(.filesRenamed)).font(.system(size: 12)).foregroundStyle(.secondary)
        Spacer(minLength: 0)
        if !entry.lastLabel.isEmpty {
          Text("\(L10n.t(.last, entry.lastLabel)) · \(entry.lastCount)")
            .font(.system(size: 11)).foregroundStyle(.secondary).lineLimit(1)
        } else {
          Text(L10n.t(.preset, entry.quickPresetName)).font(.system(size: 11)).foregroundStyle(.secondary).lineLimit(1)
        }
      }
      VStack(spacing: 8) {
        ActionPill(title: L10n.t(.photos), symbol: "photo.on.rectangle", url: LoteLinks.photos, prominent: true)
        ActionPill(title: L10n.t(.files), symbol: "folder", url: LoteLinks.files)
        ActionPill(title: L10n.t(.camera), symbol: "camera", url: LoteLinks.camera)
      }
      .frame(width: 132)
    }
  }
}

struct LoteHomeWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: LoteEntry
  var body: some View {
    Group {
      if !entry.isPro {
        LockedHomeView()
      } else {
        switch family {
        case .systemMedium: HomeMediumView(entry: entry)
        default: HomeSmallView(entry: entry)
        }
      }
    }
    .containerBackground(for: .widget) { Color("LoteBackground") }
    .widgetURL(entry.isPro ? LoteLinks.photos : LoteLinks.pro)
  }
}

struct LoteHomeWidget: Widget {
  let kind = "LoteHomeWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: LoteProvider()) { entry in
      LoteHomeWidgetView(entry: entry)
    }
    .configurationDisplayName("Lote")
    .description(L10n.t(.homeDescription))
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
