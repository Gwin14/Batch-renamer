import SwiftUI
import WidgetKit

@main
struct LoteWidgetBundle: WidgetBundle {
  var body: some Widget {
    LoteHomeWidget()
    LoteLockScreenWidget()
    LoteRenameControl()
  }
}
