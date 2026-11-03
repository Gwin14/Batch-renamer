import AppIntents
import SwiftUI
import WidgetKit

/// Opens the app on the quick-rename flow (photo picker + quick preset).
struct OpenQuickRenameIntent: AppIntent {
  static let title: LocalizedStringResource = "Renomear fotos"
  static let description = IntentDescription("Abre o Lote no seletor de fotos com o preset rápido.")
  static let isDiscoverable = true
  static let openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult & OpensIntent {
    .result(opensIntent: OpenURLIntent(LoteLinks.photos))
  }
}

/// iOS 18 control: Control Center, Lock Screen bottom buttons and the Action button.
struct LoteRenameControl: ControlWidget {
  static let kind = "com.fabiosantos.lote.control.rename"

  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: Self.kind) {
      ControlWidgetButton(action: OpenQuickRenameIntent()) {
        Label("Renomear fotos", systemImage: "wand.and.rays")
      }
    }
    .displayName("Renomear fotos")
    .description("Abre o Lote direto no seletor de fotos.")
  }
}
