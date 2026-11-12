# Tactical & Surveillance Combat Drone Sim

Mô phỏng drone giám sát & tác chiến, chạy hoàn toàn trên trình duyệt. Drone cất cánh từ bãi đáp của Nhà Máy Sản Xuất, mang camera gimbal để tuần tra theo tuyến, oanh tạc mục tiêu (Bomber), né vật cản A* và APF, và tự động bay về căn cứ (RTL). Bạn điều khiển drone bằng lệnh, bàn phím hoặc cần ảo, và theo dõi mọi thứ qua dashboard và cảnh 3D.

**Chạy thử:** https://huy-htg.github.io/drone-sim/

![Giao diện mô phỏng](docs/screenshot.png)

## Các phần của giao diện

| Phần | Nội dung |
|---|---|
| **Chức năng** (Điều hành nhiệm vụ) | Lệnh ARM, DISARM, TAKEOFF, LAND, HOLD, MANUAL, MISSION, RTL, KILL. Chọn chế độ bay Tự động (AUTO) hoặc Lái tay (MANUAL). Chọn nhiệm vụ bay (Tuần tra hoặc Bomber oanh tạc mục tiêu). Chỉnh độ cao, khoảng cách an toàn, tuyến bay (preset hoặc click mặt đất 3D), tham số bay, gió và các tình huống lỗi. |
| **Giám sát** | Số người và xe đã nhận diện, số đang thấy, độ phủ mặt đất; bản đồ giám sát (khu căn cứ / công trình, tuyến bay, người, xe); nhật ký nhận diện. |
| **Máy trạng thái** | 10 trạng thái, sơ đồ tô sáng trạng thái hiện tại và lần chuyển gần nhất, danh sách lệnh hợp lệ, nhật ký sự kiện. |
| **Dashboard** | ALT, V/S, GS, HDG, khoảng cách về nhà máy, khoảng cách vật cản; chân trời nhân tạo, băng hướng mũi; pin 6S (điện áp, dòng, mAh, thời gian còn lại); RPM 4 động cơ; biểu đồ 30 giây; setpoint của bộ điều khiển. |
| **3D** (Three.js) | Khu vực căn cứ & xưởng nhà máy, địa hình tự nhiên; quỹ đạo bay, điểm né vật cản, đường thẳng bị chắn (nét đứt đỏ), tuyến RTL (nét đứt xanh), tia Lidar, vùng đệm an toàn, vệt bay và hiệu ứng luồng gió 3D mờ ảo. Có 3 góc nhìn ngoài và góc nhìn **camera trên drone**; thu phóng bằng cuộn chuột, chụm 2 ngón, nút + / − hoặc phím + / −. Công trình nằm giữa camera và drone tự làm mờ để không che drone. |

## Cách dùng

Mở `index.html` bằng trình duyệt (cần mạng để tải Three.js và font từ CDN). Không cần cài đặt hay build gì.

- **Tuần tra tự động:** Bấm **Auto bay 1 vòng** trong phần Tuần tra: drone tự ARM → TAKEOFF → MISSION, bay 1 vòng theo tuyến rồi tự động RTL về Nhà máy và hạ cánh.
- **Nhiệm vụ Bomber:** Chọn mục tiêu, khối lượng bom (0,25–2 kg) và bấm **💣 Xuất kích ném bom**: drone cất cánh, bay thẳng qua mục tiêu, máy tính trên drone giải đạn đạo liên tục và tự cắt bom (CCRP), bay thoát ly rồi tự RTL về căn cứ. **Mỗi chuyến chỉ mang 1 quả**: thả xong thì mọi lệnh thả tiếp đều bị từ chối; bom chỉ được nạp lại khi drone đã hạ cánh trên bãi Nhà máy và tắt động cơ (hoặc khi Đặt lại).

| Phím | Tác dụng (khi ở HOVER hoặc MANUAL) |
|---|---|
| `W` `S` / `↑` `↓` | Tiến / lùi |
| `A` `D` / `←` `→` | Sang trái / phải |
| `Q` `E` | Xoay mũi |
| `R` `F` | Lên / xuống |
| `B` | Thả bom thủ công (chỉ khi còn bom, cao ≥ 3 m) |

Đang HOVER mà chạm cần hoặc phím thì drone tự chuyển sang MANUAL. Buông cần thì drone phanh lại rồi giữ vị trí.

Các phím chức năng dùng được ở mọi trạng thái:

| Phím | Tác dụng |
|---|---|
| `C` | Bật / tắt góc nhìn camera trên drone |
| `H` | Ẩn mọi bảng dashboard để chỉ xem 3D; bấm lại để hiện lại |
| `T` | Camera quang học ↔ camera nhiệt |
| `N` | Ngày ↔ đêm |
| `+` / `−` | Phóng to / thu nhỏ góc nhìn 3D (kể cả góc nhìn quỹ đạo) |

### Ẩn và hiện các bảng

Nút **Bảng** trên đầu trang mở danh sách các bảng: Điều hành nhiệm vụ, Telemetry, Giám sát, Máy trạng thái, Kết quả bay thử, Báo cáo hành trình. Bỏ chọn để ẩn, chọn để hiện lại. **Chỉ xem 3D** ẩn tất cả, khung 3D giãn ra toàn bộ chiều rộng. Mỗi bảng cũng có nút × ở góc tiêu đề. Trình duyệt nhớ lựa chọn cho lần mở sau.

Trong bảng Điều hành nhiệm vụ và bảng Telemetry, bấm tiêu đề một mục để ẩn hoặc hiện mục đó. Nút **Thu gọn hết / Mở hết** trên đầu mỗi bảng ẩn hoặc hiện tất cả các mục cùng lúc.

### Camera trên drone

Drone mang một camera gimbal treo dưới mũi. Người điều khiển xem được hình từ camera theo hai cách:

- **Cửa sổ nhỏ** ở giữa đáy khung 3D, hiện hình camera trong khi bạn xem drone từ bên ngoài. Bấm vào cửa sổ để phóng to.
- **Camera drone** (nút trên khung 3D hoặc phím `C`): hình camera chiếm toàn khung. Màn hình hiển thị đè lên hình (OSD) gồm REC và thời gian ghi, trạng thái, pin, hướng mũi, góc gimbal, độ cao, tốc độ lên/xuống, tốc độ, khoảng cách về nhà máy, gió, tâm ngắm và đường chân trời. Lúc này cửa sổ nhỏ chuyển thành bản đồ nhìn từ trên xuống (bắc lên trên) có mũi tên chỉ hướng drone. Bấm bản đồ để quay lại góc nhìn ngoài.

Điều khiển camera nằm ở hàng **Camera** dưới khung 3D:

- **Gimbal ▲ ▼** chỉnh góc ngẩng/chúc từ +20° đến −90°, mỗi lần 10°. **Nhìn xuống** chúc thẳng −90°. **Mặc định** về −15°, hướng theo mũi, zoom 1×.
- **Zoom 1× 2× 4×**. Ở chế độ toàn khung còn có thể cuộn chuột hoặc chụm 2 ngón (1× đến 6×). Kéo chuột để xoay gimbal: kéo dọc để ngẩng/chúc, kéo ngang để quay trái/phải tới ±120°. Nhấp đúp để về mặc định.
- **Ổn định gimbal**: bật thì hình luôn cân bằng, chỉ quay theo hướng mũi. Tắt thì camera gắn cứng vào khung, hình nghiêng theo drone; khi gió mạnh sẽ thấy rõ drone phải nghiêng vào gió.
- **Tự động theo nhiệm vụ**: camera tự quét hai bên khi tuần tra, nhìn vào mục tiêu khi oanh tạc, hoặc bám người/xe bạn chọn. Chỉnh gimbal bằng tay thì chế độ này tự tắt.
- **AR tuyến bay**: vẽ tuyến bay, mục tiêu và vệt bay chồng lên hình camera.

![Góc nhìn camera trên drone với OSD và bản đồ thu nhỏ](docs/camera.png)

## Nhiệm vụ bay

Chọn nhiệm vụ ở phần **Nhiệm vụ bay** (bảng Điều hành):

| Nhiệm vụ | Cách bay | Camera & Tác chiến |
|---|---|---|
| **Tuần tra** | Tuyến tuần tra tự chọn bằng cách click vào khu vực trên mặt đất 3D. Drone tự động lập tuyến né vật cản A*, cất cánh bay 1 vòng theo các điểm đã chọn và tự động quay về Nhà máy (RTL). | Chúc −32°, quét qua lại hai bên ±55°. |
| **Bomber (Oanh tạc)** | Chọn mục tiêu (Kho quân khí, Trạm radar phòng không, Đoàn xe cơ giới, Boongke, hoặc tự click mặt đất) và khối lượng bom. Drone bay tới điểm IP cách mục tiêu 70 m, bay thẳng và ngang qua mục tiêu; CCRP cắt bom đúng lúc điểm rơi dự đoán trùng mục tiêu; sau đó thoát ly và về hạ cánh tại Nhà máy. | Camera chúc vào mục tiêu; vòng đỏ CCIP trên mặt đất là điểm rơi dự đoán. Bom rơi theo trạng thái đạn đạo của lõi mô phỏng; vụ nổ, mảnh vỡ, khói và xác mục tiêu tính theo vật lý (xem dưới). |

### Nhận diện mục tiêu

Camera nhận diện đối tượng khi đủ 3 điều kiện: đối tượng nằm trong khung hình, đủ độ phân giải trên cảm biến 1920 × 1080, và đường nhìn từ ống kính không bị vật cản che.

Đối tượng được nhận diện có khung màu trong hình camera (cả toàn khung lẫn cửa sổ nhỏ) và vòng tròn trên bản đồ giám sát. Mỗi lần một đối tượng xuất hiện lại sau hơn 15 giây vắng mặt được ghi một dòng vào **Nhật ký nhận diện**. Bấm một dòng để camera bám theo đối tượng đó.

### Ban đêm và camera nhiệt (hồng ngoại)

Ở hàng **Camera** dưới khung 3D:

- **Ngày / Đêm** (phím `N`): ban đêm trời tối, cửa sổ và đèn đường sáng, tự động kích hoạt chế độ hồng ngoại.
- **Quang học / Nhiệt** (phím `T`): đổi giữa camera quang học (ảnh màu) và camera nhiệt.
  - Camera nhiệt có hai bảng màu: **Trắng nóng** và **Ironbow**.
  - Người (34–37 °C) và xe có động cơ, lốp nóng nổi bật trên nền công trình và mặt đất nguội.

## Yêu cầu của các bên liên quan (SCV)

Bảng **Yêu cầu bên liên quan** thể hiện các năng lực của dòng Drone:

| Need ID | Tên | Đang áp dụng khi |
|---|---|---|
| CC1_N01 | Cất cánh và hạ cánh thẳng đứng | TAKEOFF hoặc LANDING |
| CC1_N02 | Giữ vị trí cố định | Đang treo (HOVER) |
| CC1_N03 | Đáp ứng lệnh điều khiển bay | Bay theo lệnh: MANUAL, MISSION, RTL, FAILSAFE |
| CC1_N04 | Giữ vị trí khi có gió giật | Đang treo khi có gió |
| CC1_N05 | Giới hạn khối lượng cất cánh | Cất cánh hoặc đang bay |
| CC1_N06 | Khả năng tốc độ bay | Tốc độ ngang trên 1 m/s |
| CC1_N07 | Khả năng độ cao bay | Đang bay trên 5 m |
| CC2_N01 | Phát hiện vật cản | Lidar thấy vật cản trong 15 m |
| CC2_N02 | Dừng trước vật cản | Lực đẩy APF đang tác động, hoặc đang bay qua điểm né A* |
| CC3_N01 | Liên kết với trạm mặt đất | Còn liên kết (không mất liên kết) |
| CC3_N02 | Truyền lệnh | Trong 3 s sau khi gửi lệnh |
| CC3_N03 | Trạng thái thực thi lệnh | Trong 8 s sau khi lệnh được chấp nhận hoặc từ chối |
| CC3_N04 | Ảnh tĩnh cơ bản | Trong 8 s sau khi chụp ảnh |
| CC4_N01–N03 | Truyền dữ liệu vị trí / độ cao / trạng thái pin | Khi còn liên kết |
| V1_VC1_N01 | Chụp ảnh ban ngày | Camera bật, ban ngày |
| V1_VC1_N02 | Chụp ảnh ban đêm | Camera bật, ban đêm |
| V1_VC1_N03 | Ảnh tĩnh độ phân giải cao | Trong 8 s sau khi chụp ảnh 20MP |
| V1_VC1_N04 | Truyền video trực tiếp | Đang xem hình camera (toàn khung hoặc cửa sổ nhỏ) |
| V1_VC1_N05 | Phóng to mục tiêu | Zoom lớn hơn 1× |
| V1_VC1_N06 | Thời gian bay giám sát | Đang bay nhiệm vụ |

## Kết quả bay thử: thử nghiệm đáp ứng gió

Phần **Kết quả** tổng hợp dữ liệu từ các chuyến bay đã ghi trong báo cáo hành trình.

Bấm **Chạy chương trình bay thử** để drone bay thực nghiệm tự động trong khung 3D: drone cất cánh, treo trên Nhà máy, rồi cứ 12 s thay đổi điều kiện gió (0 → 3 → 6 → 9 → 12 m/s, đổi hướng gió, gió giật 30% và hết giật, sau đó hạ cánh).

- **Đoạn đo ổn định:** drone treo (HOVER) với gió, giật và bộ điều khiển không đổi. Lấy trung bình: góc nghiêng, lực đẩy, ga động cơ, dòng điện.
- **Phản ứng:** mỗi lần đổi gió, ghi nhận độ lệch ngang và độ cao trong 12 s sau đó cùng thời gian ổn định lại.

## Báo cáo hành trình

Mỗi chuyến bay được ghi lại tự động: bắt đầu khi ARM hoặc TAKEOFF, kết thúc khi drone hạ cánh, bị ngắt khẩn cấp hoặc tắt động cơ.

- **Tóm tắt:** kết quả, tổng thời gian và thời gian trên không, quãng đường, pin đã dùng, khoảng cách gần nhất tới vật cản, tốc độ và góc nghiêng tối đa.
- **Quỹ đạo nhìn từ trên xuống:** đường bay thực tế tô màu theo trạng thái, vẽ chồng lên tuyến A\* dự kiến (nét đứt) và vùng đệm an toàn quanh các xưởng.
- **Diễn biến theo thời gian:** dải trạng thái, cùng 4 biểu đồ: độ cao, tốc độ ngang, pin, khoảng cách tới vật cản.
- **Tua lại & Xuất dữ liệu:** kéo thanh tua để xem lại mọi thời điểm; nút **Tải dữ liệu CSV** và **Lưu ảnh quỹ đạo**.

## Điều khiển thích nghi theo gió

Bộ điều khiển sử dụng dữ liệu quán tính từ IMU:

| Tham số | Loại | Nguyên lý hoạt động |
|---|---|---|
| Bù nhiễu gió d̂ và gió ước lượng ŵ | thích nghi | Bộ quan sát nhiễu d̂ = a_đo − z_b·T/m̂ (τ = 0,5 s), được bù trước vào lệnh gia tốc. Gió ŵ suy ngược từ mô hình lực cản. |
| Khối lượng ước lượng m̂ | thích nghi | m̂ ← T·z_b / (a_z + g), lọc thông thấp τ = 1 s, hội tụ về khối lượng thật 2.8 kg. |
| Kp vị trí 1,05 · Kp vận tốc 2,5 · Kp/Kd tư thế 78/14 | cố định | Tối ưu cho khung quadcopter 800 mm. |

Góc nghiêng giữ vị trí trước gió tuân theo công thức vật lý: `tan θ = F_d / (m · g)`.

## Mô hình động lực học

Toàn bộ chuyển động tích phân với bước cố định, không phụ thuộc tốc độ khung hình.

- **Drone – vật rắn 6 bậc tự do:** trạng thái gồm vị trí và vận tốc khối tâm, quaternion tư thế, tốc độ góc thân và tốc độ 4 rôto; tích phân RK4 ở 250 Hz.
  - Tịnh tiến: `m·v̇ = R·[0,0,Σk_T·Ω²] − (k_d + k_q|v_r|)·v_r + ΣF_tiếp_đất − m·g·ẑ`, với `v_r` là vận tốc so với gió.
  - Quay (Newton–Euler): `I·ω̇ = Σr×f + Σs·(k_m·f + J_r·Ω̇)·ẑ + J_r·(Σs·Ω)·(ω×ẑ) + Σr_c×F_c − ω×I·ω`, gồm cả mô-men con quay của rôto.
  - Động học: `q̇ = ½·q⊗[0,ω]`. Động cơ: `Ω̇ = (Ω_lệnh − Ω)/τ`, τ = 40 ms, lực đẩy `f = k_T·Ω²` (22 N mỗi động cơ ở 9200 rpm).
  - Khối lượng và quán tính tính theo cấu hình (định lý trục song song): 2,8 kg khi không mang bom, cộng thêm khối lượng bom khi mang.
- **Tiếp đất:** 4 chân càng và 4 bầu động cơ là điểm tiếp xúc lò xo – giảm chấn có độ cứng tăng dần, ma sát Coulomb neo lò xo (có ma sát tĩnh thật, không trôi). Hạ cánh, đỗ trong gió, lật hay rơi khi KILL đều do cùng phương trình.
- **Bộ điều khiển:** PID xếp tầng vị trí → vận tốc → lực riêng mong muốn → trục z thân mong muốn (giới hạn nghiêng 34°, ưu tiên độ cao) → sai số tư thế trên SO(3) (tách nghiêng và hướng mũi như PX4) → mô-men có bù `ω×Iω` và con quay rôto → bộ trộn. Tích phân chống bão hoà kiểu tích phân có điều kiện.
- **Gió:** một trường gió chung cho drone, bom, khói, mảnh vỡ, vệt gió, cây, cờ và mây. Gió nền theo profile logarit lớp sát mặt đất (tham chiếu 10 m, z₀ = 3 cm); gió giật là nhiễu loạn "đông cứng" (giả thuyết Taylor) trôi theo gió.
- **Bom (đạn đạo chất điểm 3 bậc tự do):** `ẍ = −(ρ(z)·C_d·A/2m)·|v−w|·(v−w) − g·ẑ`, C_d = 0,30, đường kính tỉ lệ `m^(1/3)` (Ø 9 cm ở 1 kg), mật độ khí theo khí quyển chuẩn ISA; tích phân RK4. Bom tách ra bảo toàn động lượng (drone nhẹ đi, m̂ tự hội tụ lại). Bom chạm đất hoặc chạm mái nhà.
- **CCRP:** mỗi chu kỳ điều khiển, drone mô phỏng trước quỹ đạo bom từ trạng thái thật và gió ước lượng ŵ, rồi cắt bom khi điểm rơi dự đoán vượt qua mục tiêu theo hướng bay. Nếu lệch ngang quá 6 m thì huỷ lượt và giữ bom.
- **Vụ nổ:** TNT tương đương W = 0,4·m. Mặt sóng xung kích theo Sedov–Taylor `R = 1,033·(E·t²/ρ)^(1/5)` cho tới khi chậm còn 343 m/s. Quả cầu lửa ≈ 1,93·W^0,32 m, hố bom ≈ 0,8·W^(1/3) m. Mảnh vỡ bay đạn đạo có cản và nảy trên đất. Khói bốc lên theo lực nổi, loe rộng theo lý thuyết luồng phụt Morton–Taylor–Turner và trôi theo gió.
- **Giao thông mặt đất:** xe theo mô hình xe đạp động học (`ψ̇ = v·tan δ/L`), bám đường bằng pure pursuit, góc lái ≤ 35°, gia tốc ngang ≤ 3 m/s², +2,5/−4 m/s², giữ khoảng cách xe trước. Người đi bộ ≤ 1,4 m/s, gia tốc ≤ 1 m/s².
- **Hồ nước:** sóng lan theo hệ thức tán sắc nước sâu `ω = √(g·k)`, phản xạ bầu trời theo hệ số Fresnel (Schlick).
- **Pin:** 6S 12000 mAh, dòng tính từ lực đẩy từng động cơ.

## Môi trường 3D

Bầu trời có mặt trời và quầng tán xạ Henyey–Greenstein, mây trôi theo gió; ban đêm có sao, trăng, đèn căn cứ, đèn xe. Bóng đổ thật từ mặt trời (hoặc trăng). Vùng bay ±175 m phẳng đúng như giả định của mô hình vật lý, bên ngoài là đồi núi, rừng thông và cây lá rộng (cây uốn theo áp suất động của gió ∝ U²), hồ nước, ruộng lúa, quốc lộ và đường vành đai có xe chạy. Căn cứ có hàng rào, cổng, chốt gác, tháp canh, cột đèn, cờ bay theo gió. Bốn mục tiêu Bomber có mô hình riêng (kho có hầm đất và hòm đạn, xe radar quay 6 vòng/phút, đoàn xe quân sự, boongke bê tông) và chuyển sang trạng thái cháy rụi khi bị đánh trúng.

## Máy trạng thái

| Trạng thái | Ý nghĩa | Chuyển đi khi |
|---|---|---|
| DISARMED | Động cơ tắt | ARM |
| ARMED | Quay không tải trên đất | TAKEOFF, DISARM, tự DISARM sau 12 s |
| TAKEOFF | Leo thẳng tới độ cao cất cánh | đạt độ cao → HOVER |
| HOVER | Giữ vị trí E/N/U và hướng mũi | MANUAL / chạm cần, MISSION, RTL, LAND |
| MANUAL | Lái tay, có APF bảo vệ | HOLD, MISSION, RTL, LAND |
| MISSION | Bay theo quỹ đạo A\* thực hiện nhiệm vụ | hoàn thành → RTL / HOVER / LAND |
| RTL | Leo tới độ cao RTL, theo tuyến né vật cản về Nhà máy | tới bãi đáp → LANDING |
| LANDING | Hạ cánh tốc độ giảm dần êm ái | chạm đất 0,4 s → ARMED |
| FAILSAFE | Pin yếu hoặc mất liên kết: tự về Nhà máy | tới nơi → LANDING |
| EMERGENCY | KILL hoặc va chạm: ngắt động cơ khẩn cấp | nằm yên trên đất → DISARMED |

## Kiểm thử

Lõi mô phỏng không phụ thuộc DOM, chạy kiểm thử tự động với Node:

```bash
node tests/run-scenarios.js
```

Bộ kiểm thử gồm 36 kiểm tra:

- Các kịch bản bay: waypoint, cua 14 m/s, HOLD rồi MISSION, FAILSAFE, A*, tuần tra, quét, bay vòng, điều khiển thích nghi.
- Vật lý: đạn đạo không cản trùng nghiệm giải tích, vận tốc tới hạn của bom khớp √(2mg/ρC_dA), lực đẩy treo = m·g, xoay mũi không trôi, KILL rơi đúng thời gian lý thuyết, đỗ trong gió không trôi.
- Bomber: CCRP trúng trong 3 m với mọi khối lượng bom và gió tới 9 m/s, quy tắc 1 quả mỗi chuyến, giới hạn 2 kg.
- Giao thông mặt đất: xe và người không vượt giới hạn động học.

## Cấu trúc

```
index.html               Toàn bộ ứng dụng: HTML, CSS, lõi lập nhiệm vụ (script#surv-core), lõi mô phỏng (script#sim-core) và giao diện Three.js
tests/run-scenarios.js   Kiểm thử lõi mô phỏng tự động bằng Node
docs/                    Ảnh chụp màn hình và tài liệu
```

## Giấy phép

MIT. Xem [LICENSE](LICENSE).
