// Imprime en JSON los escritorios de cada pantalla, en vivo: [{id: UUID, cur: id actual, spaces: [ids en orden]}].
// Usa la API privada CGSCopyManagedDisplaySpaces (la misma que yabai); com.apple.spaces.plist se actualiza con retraso.
// Lo compila install.sh a ~/.local/bin/rym-espacios.
import Foundation
typealias MainConn = @convention(c) () -> Int32
typealias CopySpaces = @convention(c) (Int32) -> Unmanaged<CFArray>
let h = dlopen("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics", RTLD_NOW)
let conn = unsafeBitCast(dlsym(h, "CGSMainConnectionID"), to: MainConn.self)()
let arr = unsafeBitCast(dlsym(h, "CGSCopyManagedDisplaySpaces"), to: CopySpaces.self)(conn).takeRetainedValue() as! [[String: Any]]
var out: [[String: Any]] = []
for d in arr {
  let cur = ((d["Current Space"] as? [String: Any])?["ManagedSpaceID"] as? Int) ?? -1
  let sp = ((d["Spaces"] as? [[String: Any]]) ?? []).compactMap { $0["ManagedSpaceID"] as? Int }
  out.append(["id": d["Display Identifier"] as? String ?? "", "cur": cur, "spaces": sp])
}
print(String(data: try! JSONSerialization.data(withJSONObject: out), encoding: .utf8)!)
