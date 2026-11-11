# Nghiệp vụ CRM — Chợ Tốt Mua

Tài liệu mô tả nghiệp vụ phân hệ CRM đang chạy trong mã (`backend/.../modules/crm`). Nguồn số liệu mua hàng là đơn **đã giao** và **còn tiền thực giữ lại**.

Tiền thực giữ lại của một đơn:

```
tiền đơn − tổng hoàn có trạng thái refunded
```

Đơn hoàn hết (`tiền thực giữ lại ≤ 0`) không được tính là một lần mua. Mốc giao là lần chuyển sang `delivered` gần nhất; đơn không có lịch sử thì dùng ngày tạo đơn.

CRM hỏng không được làm hỏng việc giao hàng hay hoàn tiền: các hook chạy sau khi giao dịch đơn đã commit và nuốt lỗi.

---

## 1. Ai được làm gì

Nhân viên vào khu admin theo phòng ban. Khách (`buyer`) chỉ dùng web của mình.

| Việc | Kinh doanh (`sales`) | CSKH (`cs`) | Kho | Quản trị (`admin`) | Khách |
|---|:---:|:---:|:---:|:---:|:---:|
| Hồ sơ, LTV, RFM, tính lại | | Có | | | |
| Khóa, mở khóa, xóa mềm, khôi phục, sửa hồ sơ, địa chỉ | | Có | | | |
| Hội thoại, ticket, chuyển tiếp, CSAT | | Có | | | Hội thoại của mình |
| Khảo sát: tạo, gửi, xem kết quả | | Có | | | Nộp phiếu được mời |
| Gợi ý sản phẩm, đẩy vào hộp thư | | Có | | | Xem gợi ý của mình |
| Phân khúc: xem | Có | Có | | | |
| Phân khúc: tạo, sửa, xóa, làm mới | Có | | | | |
| Chiến dịch và phễu chuyển đổi | Có | | | | |
| Hộp thư của khách khác | | Có | | | Hộp thư của mình |
| Báo cáo khách hàng | | Có | | | |
| Nhật ký thao tác | | | | Chỉ xem | |

Kho và quản trị không gọi API nghiệp vụ CRM. Nhật ký chỉ xem, không sửa và không xóa.

---

## 2. Vòng đời khách hàng

Khách tự đăng ký. Nhân viên không tạo tài khoản khách từ luồng đăng ký công khai; CSKH tạo và sửa hồ sơ trên CRM (họ tên, email, số điện thoại, giới tính, ngày sinh) và quản lý địa chỉ.

| Trạng thái | Ý nghĩa |
|---|---|
| `active` | Đang dùng. Được vào phân khúc, nhận thư, khảo sát, hội thoại. |
| `locked` | Bị khóa. Không mở hội thoại, không nhận thư mới, bị gỡ khỏi phân khúc RFM mặc định. |
| `deleted` | Xóa mềm. Dữ liệu và lịch sử đơn vẫn giữ để đối soát. Hành vi với CRM giống tài khoản khóa. |

Không khóa và không xóa khi khách còn đơn chưa hoàn tất hoặc yêu cầu hoàn tiền chưa xử lý xong. Khôi phục (`deleted` → `active`) và mở khóa do CSKH thực hiện.

Đổi trạng thái kích hoạt tính lại hồ sơ ngay, không đợi 20:00. Khách không còn `active` bị gỡ khỏi mọi phân khúc RFM mặc định. Khách được mở lại thì được xếp vào đúng nhóm RFM hiện tại.

---

## 3. Hồ sơ: đã chi, LTV, RFM

Hồ sơ lưu LTV dự báo, tổng đã chi, số đơn đã giao, nhãn RFM, lần mua gần nhất và thời điểm tính.

Chưa tính lại lần nào: LTV = 0, số đơn = 0, nhãn **Chưa mua hàng**.

### 3.1 Khi nào tính lại

| Sự kiện | Việc CRM làm |
|---|---|
| Đơn chuyển sang đã giao | Tính lại LTV và RFM, rồi gửi khảo sát in-app nếu khớp sản phẩm |
| Hoàn tiền | Tính lại LTV và RFM |
| Khóa, mở khóa, xóa mềm, khôi phục | Tính lại và xếp lại phân khúc RFM |
| 20:00 mỗi ngày, giờ Việt Nam | Tính lại mọi khách (kể cả khóa và đã xóa), rồi làm mới thành viên mọi phân khúc |
| Nút Tính lại | CSKH tính lại một khách ngay |

Lịch 20:00 nằm trong tiến trình. Server tắt đúng giờ thì lần đó mất, không chạy bù khi mở lại.

### 3.2 Đã chi

Tổng tiền thực giữ lại của các đơn đã giao còn tiền, cộng cả đời. Dùng để hiển thị cột **Đã chi** và để tính LTV. Không dùng số này để chấm Monetary, và không dùng LTV để chấm điểm.

### 3.3 LTV dự báo

```
Giá trị đơn trung bình = Đã chi / Số đơn
Số năm gắn bó         = max(1, số ngày từ đơn giao đầu tiên đến hôm nay / 365)
Số đơn mỗi năm        = Số đơn / Số năm gắn bó
Vòng đời kỳ vọng      = max(2 năm, số năm gắn bó)
LTV                   = Giá trị đơn trung bình × Số đơn mỗi năm × Vòng đời kỳ vọng
```

Làm tròn về đồng. Không có đơn, hoặc đã chi ≤ 0, thì LTV = 0.

Vòng đời kỳ vọng lấy tối thiểu **2 năm** vì đây là bán lẻ có vòng đời ngắn. Đĩa game đổi theo từng đợt ra mắt, tay cầm dùng được lâu và không cần mua lại nhiều lần, nên không giả định khách gắn bó thêm tới 3 năm. Khách đã gắn bó lâu hơn 2 năm thì lấy đúng số năm đó.

Vòng đời không bao giờ ngắn hơn thời gian khách đã gắn bó, nên LTV không thấp hơn số đã chi và không về 0 khi sang năm mới. Khách gắn bó dưới một năm được tính tần suất như đã mua trong đúng một năm, để đơn mới không bị thổi phồng.

| Ví dụ | Kết quả |
|---|---|
| 1 đơn 80.000 trong năm nay | 80.000 × 1 × 2 = 160.000 |
| 2 đơn, tổng 250.000, gắn bó dưới 1 năm | 125.000 × 2 × 2 = 500.000 |
| Gắn bó hơn 2 năm | Vòng đời = số năm thực tế |

### 3.4 Điểm RFM

Ba trục chấm từ 1 đến 5. Chưa có đơn giữ lại thì nhãn là **Chưa mua hàng**, không xếp vào Đã rời bỏ.

**F** và **M** không cộng cả đời. Hành vi mua của ngành này đổi theo tháng: đĩa mới ra mắt thì khách có thể mua dồn trong một đợt, còn tay cầm thì một sản phẩm dùng được lâu, nên số đơn và số tiền từ những năm trước không còn nói được khách năm nay còn đang mua hay không. Hai trục này chỉ tính đơn trong **365 ngày** gần nhất, gồm cả đơn đúng mốc 365 ngày. Cửa sổ trượt theo ngày tính lại, không xóa bộ đếm vào ngày 1/1: tay cầm mua tháng 12 vẫn còn trong điểm của tháng 1 năm sau, rồi tự ra khỏi F và M khi đủ 365 ngày.

**R** vẫn lấy lần giao gần nhất từ trước đến nay. Điểm này đã tự giảm trong 30 đến 180 ngày, khớp nhịp ra mắt đĩa, nên không cắt thêm theo năm.

Đơn cũ hơn 365 ngày vẫn vào Đã chi, số đơn và LTV, để còn biết khách từng đáng giá bao nhiêu. Không có đơn nào trong cửa sổ thì F = 1 và M = 1. Khách từng mua không bị gán Chưa mua hàng. Nếu lần giao cũng đã quá 180 ngày thì nhóm là Đã rời bỏ. Nhóm Có nguy cơ rời bỏ chỉ còn những người trong 365 ngày vẫn mua đủ nhiều và chi đủ cao, nhưng lần giao gần nhất đã hơn 90 ngày.

| Trục | 5 | 4 | 3 | 2 | 1 |
|---|---|---|---|---|---|
| **R** — ngày từ lần giao gần nhất | 0–30 | 31–60 | 61–90 | 91–180 | Trên 180, hoặc chưa có mốc |
| **F** — số đơn trong 365 ngày | ≥ 8 | 5–7 | 3–4 | 2 | 0–1 |
| **M** — tiền giữ lại trong 365 ngày (đồng) | ≥ 8 triệu | 4 triệu – dưới 8 triệu | 1,5 triệu – dưới 4 triệu | 500 nghìn – dưới 1,5 triệu | Dưới 500 nghìn |

Ngưỡng tiền là “nhỏ hơn”: đúng 500.000 là điểm 2, đúng 8.000.000 là điểm 5.

Nhóm được xét từ trên xuống. Khớp nhóm nào thì dừng.

| Thứ tự | Nhóm | Điểm | Ý nghĩa |
|---|---|---|---|
| 1 | Champions | R 4–5, F 4–5, M 4–5 | Mua gần, mua nhiều, chi cao |
| 2 | Trung thành | R 2–5, F 3–5, M 3–5 | Giữ được tần suất và giá trị |
| 3 | Có nguy cơ rời bỏ | R 1–2, F 3–5, M 3–5 | Trong 365 ngày vẫn mua đủ nhiều và chi đủ cao, nhưng lần giao gần nhất đã hơn 90 ngày |
| 4 | Tiềm năng | R 3–5, F 1–3, M 1–3 | Mua gần nhưng còn ít đơn hoặc ít tiền |
| 5 | Đã rời bỏ | R 1–2, F 1–2, M 1–2 | Lâu không mua, ít đơn, ít tiền |
| — | Khác | Không khớp năm nhóm trên | Ví dụ mua nhiều và gần đây nhưng tổng tiền rất thấp |
| — | Chưa mua hàng | Số đơn = 0 | Chưa có đơn đã giao còn tiền |

Trung thành được xét trước Có nguy cơ. Khách có R = 2 (91–180 ngày) nhưng F và M từ 3 trở lên vẫn là Trung thành.

---

## 4. Phân khúc

Thành viên chỉ lấy khách `active`. Khách khóa hoặc đã xóa không được thêm mới. Ngày vào phân khúc cũ được giữ nếu khách vẫn khớp sau khi làm mới.

### 4.1 Sáu phân khúc RFM mặc định

Hệ thống tạo sẵn và khóa sáu phân khúc, mỗi phân khúc một nhãn: Champions, Loyal, Potential, At Risk, Lost, Other. Không sửa và không xóa. Nhãn **Chưa mua hàng** không có phân khúc mặc định.

Khi một khách vừa được tính lại, hệ thống đưa khách `active` vào đúng một phân khúc trong sáu nhóm này và gỡ khỏi năm nhóm còn lại.

### 4.2 Phân khúc tự tạo

Một phân khúc ghép một hoặc nhiều tiêu chí. Khách phải khớp **mọi** tiêu chí (giao). Trong một tiêu chí, nhiều giá trị là **hoặc**.

| Tiêu chí | Khớp khi |
|---|---|
| Tuổi | Nhóm tuổi hiện tại nằm trong danh sách. `all` là mọi nhóm. |
| RFM | Nhãn RFM hiện tại nằm trong danh sách. `all` là mọi nhãn. |
| Danh mục đã mua | Đã có đơn giao còn tiền chứa Tay cầm, Đĩa game hoặc Phụ kiện. |

Nhóm tuổi tính theo tuổi tròn tại ngày hôm nay:

| Nhóm | Tuổi |
|---|---|
| Dưới 18 | Dưới 18 |
| 18–24 | 18 đến 24 |
| 25–34 | 25 đến 34 |
| 35–44 | 35 đến 44 |
| 45+ | Từ 45 |
| Không rõ | Không có ngày sinh |

Không xóa phân khúc đang được chiến dịch dùng, để giữ lịch sử chăm sóc.

---

## 5. Báo cáo khách hàng

CSKH xem. Báo cáo đọc trực tiếp dữ liệu vận hành, không có kho phân tích riêng. Kết quả được giữ cache vài phút và bị xóa khi một hồ sơ được tính lại.

Phạm vi là khách chưa xóa. Mỗi dòng có nhóm tuổi, giới tính, số đơn, đã chi, LTV và nhãn RFM tính cùng công thức mục 3.

| Phần | Cách gom |
|---|---|
| Tuổi | Sáu nhóm ở mục 4.2 |
| Giới tính | Nam, Nữ, Không rõ. Giá trị khác hoặc trống là Không rõ |
| Sở thích danh mục | Đếm dòng hàng đã giao theo danh mục. Thiếu tên thì “Không rõ” |
| Thể loại đĩa | Đếm theo thể loại trên dòng hàng |

Phần trăm = số đếm / mẫu số × 100, làm tròn 2 chữ số. Mẫu số bằng 0 thì phần trăm bằng 0. Danh sách khách sắp theo LTV giảm dần.

---

## 6. Chiến dịch và hộp thư

Kênh duy nhất là thông báo trong ứng dụng. Không gửi email.

### 6.1 Đối tượng

Đối tượng gửi là **hợp** của hai tập, mỗi người một lần:

- thành viên các phân khúc được chọn;
- người đã mua ít nhất một sản phẩm mục tiêu (sản phẩm phải đang bán).

Chiến dịch cần ít nhất một phân khúc hoặc một sản phẩm mục tiêu. Khách không `active`, hoặc không còn hồ sơ, bị bỏ qua và được liệt kê trong danh sách bỏ qua.

### 6.2 Trạng thái thư

| Trạng thái | Khi nào |
|---|---|
| Nháp | Đã lưu tên và nội dung, chưa gửi cho khách. Phân khúc có thể để trống. |
| Lên lịch | Thời điểm bắt đầu còn ở tương lai. |
| Đã gửi | Đã vào hộp thư. |
| Đã đọc | Khách đã mở. |

Đến giờ, hệ thống phát thư đang lên lịch. Khách vừa khóa hoặc vừa xóa thì thư bị hủy, không vào hộp thư. Thư mời một khảo sát đã lưu trữ trong lúc chờ cũng bị hủy.

Chiến dịch đã có thư trong hộp thư không xóa được. Chỉ xóa được bản nháp hoặc chiến dịch còn lên lịch. Sửa chiến dịch đã gửi chỉ đổi tên và nội dung thư, không gửi thêm. Không đổi lịch sau khi đã gửi.

Ngày kết thúc, nếu có, phải sau ngày bắt đầu. Ngày kết thúc không chặn việc gửi; nó đóng cửa sổ đo “mua sau chiến dịch”.

### 6.3 Phễu chuyển đổi

Bốn tầng, mẫu số của tỷ lệ trên biểu đồ là số người được nhắm:

| Tầng | Đếm |
|---|---|
| Nhắm | Người nằm trong đối tượng gửi |
| Đã gửi | Đã có thư `sent` hoặc `read` |
| Đã đọc | Thư đã mở |
| Mua sau chiến dịch | Trong số đã gửi, có đơn **đã giao** và **ngày đặt** nằm trong cửa sổ |

Cửa sổ gồm cả hai đầu: từ `startAt` đến `endAt`. Không có ngày kết thúc thì đóng sau 30 ngày kể từ ngày bắt đầu. Thiếu ngày bắt đầu thì mốc mở là mốc thời gian gốc của hệ thống.

Có sản phẩm mục tiêu thì đơn phải chứa ít nhất một sản phẩm đó. Không có thì bất kỳ đơn đã giao nào đặt trong cửa sổ cũng tính. Đơn đặt trước chiến dịch không tính. Hệ thống không ghi mã chiến dịch lên đơn; đơn được suy ra từ cửa sổ thời gian và người đã nhận thư của chính chiến dịch đó.

Tỷ lệ chuyển đổi hiển thị riêng = số người mua / số người đã gửi.

### 6.4 Hộp thư

Khách chỉ thấy thư đã gửi hoặc đã đọc của mình. Thư lên lịch và thư nháp không hiện. CSKH được mở hộp thư của một khách. Chuông đếm thư chưa đọc của chính người đang đăng nhập.

---

## 7. Khảo sát

Ba trạng thái: nháp, đã gửi, lưu trữ.

| Việc | Quy tắc |
|---|---|
| Tạo | Luôn là nháp. Có thể gắn sẵn phân khúc đối tượng. |
| Phát hành | Chỉ từ nháp, và phiếu phải có ít nhất một câu hỏi. Phát hành không gửi hộp thư hàng loạt; từ lúc này phiếu mới tự gửi sau khi mua. |
| Sửa | Nháp và đã gửi sửa được. Đã gửi thì nội dung thư do chính phiếu viết được cập nhật theo. Thư chiến dịch giữ nguyên câu chữ của chiến dịch. Phiếu lưu trữ không sửa. |
| Xóa | Chỉ xóa nháp. Phiếu đã gửi phải lưu trữ để giữ câu trả lời. |
| Lưu trữ | Giữ câu hỏi, không cho sửa, không tự gửi thêm. |

### 7.1 Tự gửi khi đơn đã giao

Sau khi đơn sang đã giao, hệ thống xét mọi phiếu **đã gửi**:

- khách phải đang `active`;
- đơn phải thuộc đúng khách và đã giao;
- đơn phải chứa ít nhất một sản phẩm nằm trong mục tiêu của phiếu (phiếu không có sản phẩm mục tiêu thì không gửi);
- mỗi cặp phiếu–đơn chỉ gửi một lần, kể cả sau khi khởi động lại.

Nội dung thư là “tiêu đề — mô tả”, cắt còn 500 ký tự.

### 7.2 Gửi kèm chiến dịch hoặc gửi thẳng

CSKH cũng gửi phiếu tới thành viên phân khúc. Phiếu lưu trữ hoặc phiếu chưa có câu hỏi không gửi kèm chiến dịch được. Gửi thành công thì phiếu nháp chuyển sang đã gửi.

### 7.3 Khách trả lời

Chỉ khách `active`, đã có thư mời còn `sent` hoặc `read`, và phiếu đang ở trạng thái đã gửi.

- Thư gắn với một đơn: mỗi đơn một lần, và đơn phải là đơn của khách.
- Thư không gắn đơn: mỗi khách một lần.

Phải trả lời đủ mọi câu, mỗi câu một lần.

| Loại câu | Hợp lệ khi |
|---|---|
| Điểm số | Một chữ số từ 1 đến 5 |
| Trắc nghiệm | Đúng một lựa chọn có trong câu hỏi |
| Tự luận | Không trống, tối đa 2.000 ký tự |

### 7.4 Tỷ lệ hoàn thành

```
số phiếu nộp / (thư sent + thư read)
```

Phép chia nguyên, đơn vị phần trăm. Chưa gửi thư nào thì tỷ lệ bằng 0. Câu điểm số và trắc nghiệm thống kê theo từng lựa chọn. Câu tự luận liệt kê nội dung.

---

## 8. Gợi ý sản phẩm

Gợi ý theo đơn đã giao, tối đa 10 sản phẩm (trần 50). Chỉ hàng đang đăng bán. Bỏ sản phẩm khách đã có. Cùng dữ liệu thì cùng thứ tự.

Khách chưa có đơn đã giao: lấy hàng bán chạy 90 ngày gần nhất.

Khách đã mua thì ghép theo thứ tự, dừng khi đủ số lượng:

| Đã có | Gợi ý thêm | Lý do |
|---|---|---|
| Phụ kiện, chưa có tay cầm | Tay cầm đang bán | Bổ sung tay cầm |
| Phụ kiện và tay cầm, chưa có đĩa | Đĩa bán chạy, rồi các đĩa đang bán | Bổ sung đĩa game |
| Đĩa game | Đĩa cùng thể loại đã mua | Đĩa cùng thể loại |
| Bất kỳ đơn nào | Sản phẩm hay nằm cùng giỏ với hàng đã có | Thường mua cùng |

CSKH đẩy gợi ý vào hộp thư. Có thể chọn một phần danh sách; mã không nằm trong gợi ý hiện tại bị bỏ. Khách khóa hoặc đã xóa không nhận thư. Khách chỉ xem gợi ý của chính mình.

---

## 9. Hội thoại, SLA và CSAT

Ticket và live chat dùng chung một hội thoại. Khách không chọn chế độ: có nhân viên đang trực thì mở live chat, không thì mở ticket. Ticket mở khi không có người trực được kèm lời chào của bot.

Chủ đề: khiếu nại, hỏi đơn, bảo hành, tư vấn, khác. Không chọn thì chat mặc định là tư vấn, ticket mặc định là khiếu nại. Có gắn đơn thì đơn phải thuộc đúng khách. Ưu tiên lúc mở là thường. Tài khoản khóa hoặc đã xóa không mở hội thoại.

Tin nhắn không trống, tối đa 2.000 ký tự. Khách không gửi ghi chú nội bộ và không thấy hội thoại của người khác.

### 9.1 Trạng thái

```
mở → đang xử lý → đã đóng
```

| Bước | Điều kiện |
|---|---|
| Sang đang xử lý | Nhân viên gửi tin công khai, hoặc tự nhận. Hội thoại được gán cho nhân viên đó nếu chưa có người phụ trách. |
| Ticket sang live chat | Hội thoại chưa đóng. Gán nhân viên hiện tại và ghi một tin hệ thống “Đã chuyển cho nhân viên hỗ trợ”. |
| Đóng | Đã có người phụ trách và đã có tin công khai của nhân viên (không phải của khách). |
| Đang xử lý về hàng đợi | Được phép. Hội thoại đã đóng không mở lại. |
| Khách nhắn sau khi đóng | Bị từ chối. Khách mở yêu cầu mới. Nhân viên sau khi đóng chỉ còn ghi chú nội bộ. |

Chuyển tiếp sang nhân viên CSKH khác, ghi chú nội bộ, giữ lịch sử gán. Không chuyển hội thoại đã đóng và không chuyển cho người đang phụ trách.

Hàng đợi sắp: vượt SLA, rồi sắp hết hạn, rồi còn hạn, rồi đã đóng. Trong cùng nhóm thì hạn gần hơn trước, ưu tiên cao trước, tin cuối mới hơn trước. Lọc được: của tôi, đang mở, ưu tiên cao, đã đóng.

### 9.2 SLA

Đồng hồ chạy từ lúc mở. Không có mốc mở thì dùng tin nhắn cuối. Không lưu cột; tính lại mỗi lần đọc.

| Ưu tiên | Hạn |
|---|---|
| Cao | 1 giờ |
| Thường, hoặc thiếu ưu tiên | 4 giờ |
| Thấp | 24 giờ |

| Trạng thái | Khi nào |
|---|---|
| Còn hạn | Chưa đóng và còn hơn 15 phút |
| Sắp hết | Chưa đóng và còn từ 0 đến 15 phút |
| Vượt SLA | Chưa đóng và đã qua hạn |
| Đã xong | Hội thoại đã đóng |

Trên trang chủ CRM, hiệu suất chỉ tính hội thoại chưa đóng:

```
% đúng hạn = làm tròn( (số đang mở − số vượt SLA) / số đang mở × 100 )
```

Không có hội thoại đang mở thì coi là 100%. Mục tiêu hiển thị là 90%. “Sắp hết hạn” vẫn tính là đúng hạn.

### 9.3 CSAT

Sau khi hội thoại đóng, khách đang hoạt động chấm từ 1 đến 5, mỗi hội thoại một lần. Điểm lưu như một tin loại CSAT.

---

## 10. Nhật ký thao tác

Mọi thao tác ghi dữ liệu được ghi thêm một dòng tiếng Việt (khóa khách, đổi trạng thái đơn, hoàn tiền, khuyến mãi, kho, nhân viên, khảo sát, chiến dịch, hội thoại). Chỉ quản trị hệ thống được xem. Không sửa và không xóa dòng đã ghi.
