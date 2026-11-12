# Thiết kế: Động lực học toàn hệ + môi trường 3D mới cho Drone Sim

Ngày: 2026-11-12 · Trạng thái: chờ duyệt · Phạm vi: `index.html` (surv-core, sim-core, giao diện Three.js), `tests/run-scenarios.js`

## Mục đích

1. Toàn bộ chuyển động trong mô phỏng (thân drone, động cơ, bom, gió, tiếp đất) tuân theo các phương trình động học và động lực học chuẩn, không còn hệ số "mò" hay tích phân theo khung hình.
2. Mỗi lần xuất kích chỉ thả được đúng 1 quả bom; khối lượng bom chọn được, tối đa 2,0 kg.
3. Cảnh 3D được dựng lại chi tiết và đẹp (bầu trời, ánh sáng, bóng đổ, địa hình, căn cứ, mục tiêu có mô hình thật), vẫn một file HTML chạy thẳng trên trình duyệt, không build.

Không đổi: Three.js r128 từ CDN, kiến trúc một file, máy trạng thái 10 trạng thái, A* + APF, các bảng giao diện, camera nhiệt, bảng SCV, báo cáo hành trình, kiểm thử chạy bằng `node tests/run-scenarios.js`.

## 1. Động lực học thân drone (sim-core)

Thay mô hình hiện tại (cộng tốc độ góc vào góc Euler, bỏ qua mô-men con quay) bằng vật rắn 6 bậc tự do:

- **Trạng thái:** vị trí E/N/U, vận tốc, quaternion thân → thế giới, tốc độ góc thân ω. Góc Euler chỉ còn là đại lượng suy ra để hiển thị và cho bộ điều khiển.
- **Tịnh tiến:** m·v̇ = R·[0,0,T]ᵀ − m·g·ẑ + F_cản(v − v_gió) + F_tiếp_đất. Lực cản giữ dạng tuyến tính + bậc hai theo vận tốc tương đối với gió như hiện nay nhưng tính trong một chỗ duy nhất.
- **Quay:** I·ω̇ = τ − ω × (I·ω) + τ_con_quay, với I lấy từ khung 800 mm 2,8 kg (xấp xỉ đĩa + 4 khối động cơ: Ixx = Iyy ≈ 0,045, Izz ≈ 0,085 kg·m²); τ_con_quay = −Σ J_r·(ω × ẑ_b)·Ω_i theo chiều quay từng rôto, J_r ≈ 6·10⁻⁵ kg·m².
- **Động học quaternion:** q̇ = ½·q⊗[0, ω]; chuẩn hoá mỗi bước.
- **Rôto:** mỗi động cơ giữ độ trễ bậc nhất 40 ms; lực đẩy Tᵢ = k_T·Ωᵢ², mô-men phản lực Qᵢ = k_Q·Ωᵢ² với k_T, k_Q suy từ lực đẩy tối đa 22 N và hình học khung; bộ trộn X chuẩn cho τ_roll, τ_pitch, τ_yaw.
- **Khối lượng thay đổi:** m = 2,8 kg + m_bom khi còn mang bom; thả bom thì m giảm tức thời, I giảm phần bom treo dưới bụng. Bộ ước lượng m̂ và d̂ giữ nguyên thuật toán, tự hội tụ lại sau khi thả.
- **Tiếp đất:** lò xo–giảm chấn theo phương đứng tại 4 chân, mỗi chân sinh lực và mô-men lên thân, ma sát ngang Coulomb bão hoà; thay cho việc kẹp độ cao ≥ 0 hiện nay. LANDING/EMERGENCY dùng cùng mô hình, nên drone bị KILL giữa trời sẽ rơi tự do có cản, chạm đất và nảy/lật theo vật lý.
- **Tích phân:** RK4 bước cố định 4 ms (250 Hz, trùng vòng điều khiển trong); hàm vẽ chỉ nội suy, không tích phân vật lý theo khung hình nữa.
- **Bộ điều khiển:** giữ cấu trúc PID xếp tầng và hệ số hiện có; vòng tư thế chuyển sang bám quaternion/trục-góc (sai số nhỏ tương đương PD trên góc). Nếu kiểm thử cho thấy dao động, chỉnh Kd tư thế, ghi rõ trong báo cáo thay đổi.

## 2. Bom và nhiệm vụ Bomber

- **Khối lượng bom:** người dùng chọn trong phần Bomber, mặc định 1,0 kg, cho phép 0,25–2,0 kg (giới hạn cứng 2,0 kg). Đường kính/diện tích cản tỉ lệ theo m^(2/3) từ mốc 1 kg ↔ Ø9 cm.
- **Đạn đạo:** chất điểm chịu trọng lực + cản bậc hai đẳng hướng theo vận tốc tương đối với gió: a = g − (ρ·C_d·A/2m)·|v_r|·v_r, C_d = 0,30 (dạng bom có cánh đuôi), ρ = 1,225. Tích phân RK4 bước 4 ms trong sim-core; phần 3D chỉ vẽ theo trạng thái. Vận tốc đầu đúng bằng vận tốc drone tại thời điểm cắt (cộng vận tốc điểm treo do ω nếu đáng kể — bỏ qua được vì ‖ω×r‖ < 0,1 m/s, ghi chú trong code).
- **Điểm cắt bom:** bỏ hệ số 0,72/0,65. Mỗi bước điều khiển, dự đoán điểm rơi bằng chính bộ tích phân đạn đạo chạy nhanh (forward-simulate với gió ước lượng ŵ) từ trạng thái thật; cắt khi điểm rơi dự đoán đi qua cực tiểu khoảng cách tới mục tiêu. CEP kỳ vọng < 3 m với gió ≤ 9 m/s.
- **Một quả mỗi lần xuất kích:** đạn dược là trạng thái của sim-core (`ordnance: 1 → 0`). Thả xong, mọi đường thả (phím B, nút thả ngay, điểm cắt tự động) bị từ chối kèm thông báo "Hết bom"; nạp lại chỉ khi drone đã hạ cánh tại Nhà máy và về DISARMED, hoặc khi Đặt lại mô phỏng. Quả bom 3D dưới bụng biến mất khi thả và chỉ hiện lại khi nạp.

## 3. Gió

Một trường gió duy nhất `windAt(p, t)` cấp cho cả drone, bom và hiệu ứng 3D: gió nền + giật (giữ mô hình hiện tại) + suy giảm theo độ cao gần mặt đất (hệ số log-wind đơn giản, bằng 1 từ 10 m trở lên). Mọi lực khí động đều tính theo vận tốc tương đối với trường này.

## 4. Các vật thể chuyển động khác trong môi trường

Áp dụng cùng nguyên tắc (phương trình chuẩn, bước cố định, không phụ thuộc tốc độ khung hình) cho mọi thứ khác đang chuyển động.

Hiện trạng: `svMakeAgents()` đang trả về mảng rỗng nên cảnh không có người hay xe nào, dù bảng Giám sát và README vẫn nói tới chúng. Code di chuyển cũ (`svMoveAgents`) cũng sai động học: xe dịch chuyển tức thời từ +80 m về −80 m, người đổi chiều tức thời. Đề xuất đưa lại khoảng 12 người và 6 xe trên các trục đường quanh căn cứ (không vào trong xưởng), sinh theo hạt giống cố định để mỗi lần chạy giống nhau, và di chuyển bằng các mô hình dưới đây. Đoàn xe mục tiêu Bomber dùng cùng mô hình xe.

- **Xe:** mô hình xe đạp động học (kinematic bicycle) — ẋ = v·cos ψ, ẏ = v·sin ψ, ψ̇ = v·tan δ / L, với giới hạn gia tốc dọc (±2,5 m/s²), góc lái (±35°) và tốc độ góc lái; bám tuyến bằng pure pursuit qua mạng đường `ROAD_EW`/`ROAD_NS`, rẽ ở giao lộ thay vì dịch chuyển tức thời ở mép bản đồ.
- **Người:** chất điểm có giới hạn vận tốc 1,4 m/s và gia tốc 1 m/s², quay hướng có giới hạn tốc độ góc.
- **Mảnh vỡ, khói, vệt gió:** mảnh vỡ của vụ nổ bay theo đạn đạo (trọng lực + cản) và nảy trên mặt đất; hạt khói và vệt luồng gió 3D trôi theo đúng trường gió `windAt(p, t)` (khói có thêm lực nổi giảm dần). Đây là hiệu ứng hình ảnh nên tích phân Euler bán ẩn ở tầng giao diện là đủ, nhưng dùng cùng hàm gió và hằng số vật lý với sim-core.
- **Radar mục tiêu:** chảo quay với vận tốc góc cố định, dừng lại khi trạm bị phá huỷ.

## 5. Môi trường 3D

- **Bầu trời & ánh sáng:** vòm trời shader (tán xạ đơn giản) có mặt trời; đêm có sao, trăng, dải ngân hà mờ. `renderer.shadowMap` PCFSoft, ACESFilmic tone mapping, sRGB; đèn mặt trời đổ bóng thật cho drone, nhà xưởng, cây, mục tiêu (thay bóng tròn giả).
- **Địa hình:** vùng bay ±100 m phẳng (khớp giả định vật lý); ngoài vùng là đồi núi theo nhiễu Perlin, hồ nước có phản chiếu giả, đường nhựa nối cổng căn cứ, ruộng/bãi cỏ nhiều tông màu, rừng cây instanced (vài nghìn cây, 2–3 loại).
- **Căn cứ:** hàng rào + cổng, tháp canh, bãi đỗ xe, cột đèn (đêm bật sáng), chi tiết mái/ống khói cho các xưởng hiện có — giữ nguyên vị trí và kích thước F1–F3, P1–P3 để A*, APF và các kiểm thử cũ không đổi.
- **Mục tiêu Bomber:** mô hình thật — kho quân khí (nhà vòm + thùng đạn), trạm radar (chảo quay), đoàn xe (3–4 xe tải), boongke bê tông. Trúng bom: hố bom, xác cháy đổi hình, cột khói particle tồn tại tới cuối phiên; nổ giữ hiệu ứng hiện có, thêm vòng sóng xung kích.
- **Nhiệt/đêm:** các vật thể mới đều có lớp vật liệu cho camera nhiệt (động cơ xe, radar nóng; hồ, bê tông lạnh) và biến thể ban đêm.
- **Hiệu năng:** instancing cho cây/hàng rào, mục tiêu ≤ ~250k tam giác toàn cảnh, giữ 60 fps trên máy phổ thông; bóng đổ 1 nguồn 2048².

## 6. Kiểm thử & nghiệm thu

`tests/run-scenarios.js` (Node, không DOM) thêm:
1. Đạn đạo không cản so với nghiệm giải tích (sai số < 1 cm ở 100 m rơi); có cản so với vận tốc tới hạn lý thuyết √(2mg/ρC_dA).
2. Quy tắc 1 quả: thả lần 2 bị từ chối ở mọi đường; nạp lại đúng điều kiện.
3. Bom 0,25 / 1,0 / 2,0 kg, gió 0 / 6 / 9 m/s: sai số điểm rơi < 3 m.
4. Bảo toàn/khớp mô hình thân: treo tĩnh ⇒ T ≈ m·g; bước gió 6 m/s ⇒ góc nghiêng xác lập khớp tan θ = F_d/(m·g) ± 10%; xoay yaw không sinh trôi vị trí; thả bom ⇒ m̂ hội tụ về 2,8 kg trong < 5 s.
5. Xe: bán kính quay vòng tối thiểu khớp L / tan δ_max; không vượt giới hạn gia tốc. KILL ở 30 m: thời gian rơi khớp mô phỏng rơi có cản ± 5%, drone nằm yên sau va chạm.
6. Toàn bộ kịch bản cũ (waypoint, cua 14 m/s, HOLD, FAILSAFE, A*, tuần tra) phải còn xanh; sai lệch quỹ đạo cho phép do mô hình mới, cập nhật ngưỡng nếu cần và ghi chú.
7. Chạy trang bằng Chrome headless: không lỗi console; chụp ảnh ngày/đêm/nhiệt/Bomber để soát bằng mắt.

README cập nhật các phần Mô hình động lực học, Bomber, cấu trúc.

## Rủi ro

- Mô hình thân mới có thể làm bộ điều khiển hiện tại dao động → kiểm thử 4 phát hiện; chỉ chỉnh hệ số tư thế, ghi lại.
- Cảnh nặng hơn → ngân sách tam giác + instancing; nếu máy yếu, bóng đổ tự hạ cấp theo `pixelRatio`.
