import { Novel } from '../types/novel';

export const BUILTIN_NOVELS: Novel[] = [
  {
    id: 'hoang-tu-be',
    title: 'Hoàng Tử Bé (Le Petit Prince)',
    author: 'Antoine de Saint-Exupéry',
    description: 'Kiệt tác văn học kinh điển thế giới về tình bạn, tình yêu và những bài học nhân sinh nhìn qua đôi mắt một đứa trẻ.',
    source: 'builtin',
    chapters: [
      {
        id: 'htb-chap-1',
        title: 'Chương 1: Bức tranh con trăn nuốt con voi',
        order: 1,
        source: 'builtin',
        content: `Khi tôi lên sáu tuổi, một lần nọ tôi nhìn thấy một bức tranh tuyệt đẹp trong một cuốn sách viết về Rừng Nguyên Thủy có tựa đề là "Những Chuyện Kỳ Thú". Bức tranh vẽ một con trăn lớn đang nuốt chửng một con thú dữ.

Cuốn sách ghi rõ: "Những con trăn nuốt trọn con mồi mà không cần nhai. Sau đó chúng chẳng thể cựa quậy nổi và phải ngủ li bì suốt sáu tháng ròng để tiêu hóa thức ăn."

Khi ấy, tôi đã suy nghĩ rất nhiều về những cuộc phiêu lưu trong chốn rừng thẳm, và đến lượt mình, với một chiếc bút chì màu, tôi đã vẽ nên bức tranh đầu tiên của đời mình. Bức vẽ Số 1 của tôi. Nó như thế này: trông giống như một chiếc mũ phớt bằng nỉ màu nâu.

Tôi mang kiệt tác của mình đi khoe với những người lớn và hỏi xem bức tranh có làm cho họ sợ hãi không.

Họ đáp lại tôi: "Sao lại phải sợ một cái mũ chứ?"

Bức vẽ của tôi đâu phải là một cái mũ! Đó là một con trăn khổng lồ đang tiêu hóa một con voi bên trong bụng nó. Thế là tôi bèn vẽ thêm ruột gan con trăn, để cho người lớn có thể hiểu được. Người lớn lúc nào cũng cần người ta giải thích mọi sự cho rõ ràng.

Bức vẽ Số 2 của tôi cho thấy rõ chú voi nằm trọn trong bụng trăn. Nhưng người lớn lại khuyên tôi nên dẹp những bức vẽ trăn mở bụng hay trăn kín bụng sang một bên, mà chú tâm vào môn địa lý, lịch sử, số học và ngữ pháp thì hơn.

Thế là, ngay từ năm sáu tuổi, tôi đã từ bỏ một tiền đồ rực rỡ của nghề họa sĩ. Thất bại của Bức vẽ Số 1 và Bức vẽ Số 2 đã làm tôi nhụt chí. Người lớn chẳng bao giờ tự mình hiểu được điều gì cả, và thật là mệt mỏi cho trẻ con cứ phải luôn luôn giảng giải cho họ suốt cả ngày dài.

Vì vậy, tôi phải chọn một nghề khác và tôi học lái máy bay. Tôi đã bay gần như khắp mọi phương trời trên thế giới. Và quả thực, môn địa lý đã giúp ích cho tôi rất nhiều. Tôi có thể phân biệt ngay lập tức giữa Trung Hoa và Arizona trong chớp mắt. Điều ấy rất tiện lợi nếu người ta lỡ bay lạc trong đêm tối.`,
      },
      {
        id: 'htb-chap-2',
        title: 'Chương 2: Cuộc hội ngộ giữa sa mạc Sahara',
        order: 2,
        source: 'builtin',
        content: `Cứ như thế, tôi đã sống cô độc một mình, không có ai để thực sự trò chuyện giãi bày tâm sự, cho tới tận một chuyến bay gặp sự cố giữa sa mạc Sahara sáu năm trước. Động cơ máy bay của tôi bị gãy trục quay. Và bởi vì tôi không có thợ máy hay hành khách nào đi cùng, tôi phải tự mình cáng đáng một mình công việc sửa chữa vô cùng khó khăn ấy.

Đối với tôi, đây là vấn đề sinh tử. Tôi chỉ còn lượng nước uống vừa đủ cho đúng tám ngày.

Đêm đầu tiên, tôi chìm vào giấc ngủ trên bãi cát, cách xa mọi chốn có người ở hàng ngàn dặm. Tôi cảm thấy cô đơn hơn cả một người đắm tàu trôi dạt trên một chiếc bè giữa đại dương mênh mông. Vậy nên các bạn có thể hình dung được sự kinh ngạc khôn xiết của tôi khi bình minh hé rạng, một giọng nói nhỏ bé lạ lùng đã đánh thức tôi dậy.

Giọng nói ấy thì thầm:
— Làm ơn... xin hãy vẽ cho tôi một con cừu!
— Hả?!
— Vẽ cho tôi một con cừu...

Tôi bật dậy như thể vừa bị sét đánh trúng. Tôi dụi mắt thật kỹ. Tôi nhìn trân trân. Và tôi nhìn thấy một cậu bé phi thường đang nghiêm trang nhìn tôi chăm chú.

Tôi ngắm nhìn sự xuất hiện kỳ lạ ấy bằng đôi mắt tròn xoe vì kinh ngạc. Đừng quên rằng tôi đang bị lạc giữa sa mạc hoang vu cách mọi vùng đất có người sinh sống cả ngàn dặm. Thế mà chú bé này trông không hề có vẻ gì là đang lạc lối, cũng chẳng có vẻ kiệt sức vì mệt mỏi, đói lả, khát khô hay khiếp sợ. Cậu bé chẳng có vẻ gì của một đứa trẻ bị lạc giữa sa mạc bao la.

Khi cuối cùng tôi cũng tìm lại được tiếng nói của mình, tôi bèn hỏi:
— Nhưng... em làm gì ở đây thế này?

Và cậu bé lặp lại một cách rất dịu dàng, như thể đó là một việc vô cùng hệ trọng:
— Làm ơn... xin hãy vẽ cho em một con cừu...`,
      },
      {
        id: 'htb-chap-3',
        title: 'Chương 3: Quê hương nơi hành tinh B 612',
        order: 3,
        source: 'builtin',
        content: `Phải mất một thời gian khá lâu tôi mới hiểu được cậu bé đến từ đâu. Hoàng tử bé hỏi tôi rất nhiều câu, nhưng cậu dường như chẳng hề lắng nghe những câu hỏi mà tôi đặt ra cho cậu. Chỉ qua những lời tình cờ thốt ra từng chút một, mọi điều dần dần mới sáng tỏ trước mắt tôi.

Chẳng hạn, khi cậu lần đầu tiên nhìn thấy chiếc máy bay của tôi (tôi sẽ không vẽ chiếc máy bay đâu, bởi vì hình vẽ ấy quá phức tạp đối với tôi), cậu hỏi tôi:
— Cái vật thể kia là cái gì thế?
— Đó không phải là một đồ vật. Nó biết bay. Đó là một chiếc máy bay. Đó là máy bay của tôi.
Và tôi cảm thấy tự hào khi cho cậu biết rằng tôi có thể bay trên bầu trời. Khi ấy cậu bèn thốt lên:
— Ôi! Thế là anh từ trên trời rơi xuống à?
— Đúng vậy — tôi đáp một cách khiêm tốn.
— Ồ! Điều đó thật là buồn cười!

Và hoàng tử bé bật lên một tiếng cười trong trẻo khiến tôi cảm thấy hơi bực mình. Tôi thích người ta phải nhìn nhận những tai ương bất trắc của tôi bằng sự nghiêm túc. Rồi cậu nói tiếp:
— Thế thì anh cũng đến từ bầu trời! Anh đến từ hành tinh nào vậy?

Ngay lập tức, tôi thoáng thấy một tia sáng le lói rọi vào sự bí ẩn về sự hiện diện của cậu, và tôi chộp lấy cơ hội gặng hỏi:
— Vậy là em đến từ một hành tinh khác ư?
Nhưng cậu không trả lời. Cậu chỉ khẽ lắc đầu trong khi chăm chú nhìn chiếc phi cơ của tôi:
— Quả thực, ngồi trên cái thứ đó thì anh chẳng thể nào đi từ nơi quá xa xôi được...

Và cậu trầm ngâm suy nghĩ rất lâu. Rồi cậu rút con cừu mà tôi đã vẽ từ trong túi áo ra và ngắm nghía kho báu của mình.`,
      },
      {
        id: 'htb-chap-4',
        title: 'Chương 4: Cây bao-báp và sự kỷ luật buổi sớm',
        order: 4,
        source: 'builtin',
        content: `Mỗi ngày tôi lại biết thêm một điều gì đó về hành tinh của cậu, về chuyến ra đi của cậu, về cuộc hành trình của cậu. Mọi chuyện đến rất từ tốn, theo dòng suy ngẫm ngẫu nhiên. Đến ngày thứ ba, tôi biết được thảm kịch về loài cây bao-báp.

Lần này cũng nhờ con cừu, bởi hoàng tử bé đột ngột hỏi tôi, như thể bị dằn vặt bởi một mối hoài nghi nghiêm trọng:
— Có thật là loài cừu ăn các bụi cây nhỏ không anh?
— Đúng vậy, điều đó hoàn toàn có thật.
— Ôi! Em mừng quá!

Tôi không hiểu tại sao chuyện cừu ăn bụi cây nhỏ lại có tầm quan trọng đến thế. Nhưng hoàng tử bé nói thêm:
— Như vậy chúng cũng ăn cả cây bao-báp chứ?
Tôi giải thích cho hoàng tử bé rằng bao-báp không phải là những bụi cây nhỏ, mà là những thân cây to lớn ngang ngửa một tòa thánh đường, và cho dù cậu có mang theo cả một đàn voi về hành tinh của mình thì đàn voi ấy cũng chẳng thể gặm hết nổi một cây bao-báp duy nhất.

Ý tưởng về cả một đàn voi khiến hoàng tử bé bật cười:
— Người ta sẽ phải xếp chồng con voi nọ lên lưng con voi kia mất!
Nhưng sau đó, cậu nhận xét một cách vô cùng khôn ngoan:
— Trước khi trở thành những cây cổ thụ to lớn, những cây bao-báp cũng khởi đầu bằng việc là những cây non nhỏ bé.
— Hoàn toàn chính xác! Nhưng vì sao em lại muốn cừu của mình ăn những mầm cây bao-báp non?

Cậu đáp lại tôi ngay: "Ôi dào, anh biết rồi đấy thôi!", như thể đó là một chân lý hiển nhiên. Và tôi đã phải vận dụng rất nhiều trí óc để tự mình thấu triệt vấn đề này. Quả thực, trên hành tinh của hoàng tử bé, cũng như trên mọi hành tinh khác, có cỏ tốt và cỏ dại. Nếu đó là một mầm cây bao-báp, ta phải nhổ tiệt nó đi ngay khi vừa nhận ra nó.

"Đó là vấn đề kỷ luật bản thân," hoàng tử bé sau này kể lại với tôi. "Vào mỗi buổi sáng, sau khi đã làm vệ sinh cá nhân sạch sẽ, người ta phải cẩn thận dọn dẹp vệ sinh cho cả hành tinh của mình nữa."`,
      },
      {
        id: 'htb-chap-5',
        title: 'Chương 5: Bông hồng kiêu kỳ và bí mật của Cáo',
        order: 5,
        source: 'builtin',
        content: `Tôi đã nhanh chóng hiểu thêm về bông hoa ấy. Trên hành tinh của hoàng tử bé, từ trước đến nay chỉ có những loài hoa rất giản dị, chỉ có một hàng cánh mỏng manh, chẳng chiếm chỗ của ai và không làm phiền ai bao giờ. Chúng nở rộ trong cỏ vào buổi sáng rồi tàn úa vào lúc hoàng hôn. Nhưng một ngày kia, một hạt mầm lạ đã nảy nở, và hoàng tử bé đã theo dõi rất sát sao cái mầm nhỏ không giống những mầm khác ấy.

Bông hoa không ngừng chuẩn bị vẻ đẹp của nàng trong căn phòng xanh kín đáo. Nàng tỉ mỉ chọn lựa màu sắc, chậm rãi khoác lên mình từng lớp áo, sắp đặt từng cánh hoa một cách cầu kỳ. Nàng không muốn xuất hiện với vẻ nhàu nhĩ như loài hoa anh túc. Nàng chỉ muốn tỏa sáng trong vẻ rực rỡ trọn vẹn của nhan sắc mình.

Và rồi, vào một buổi sáng, đúng vào lúc mặt trời mọc, nàng đã hé nở.

Nàng khẽ ngáp dài và nói:
— Ôi! Em vừa mới thức dậy... Xin tha lỗi cho em... Tóc tai em vẫn còn bù xù quá...
Hoàng tử bé không thể kìm nén được lòng ngưỡng mộ:
— Nàng đẹp làm sao!
— Phải không anh? — bông hoa đáp lời nũng nịu. — Và em sinh ra cùng lúc với mặt trời đấy...

Nhưng rồi sau đó, hoàng tử bé đã gặp chú Cáo trên Trái Đất. Và chính chú Cáo đã tặng cho cậu món quà vô giá nhất:

— Đây là bí mật của tôi. Nó rất giản dị thôi: Người ta chỉ có thể nhìn thấy thật rõ ràng bằng trái tim. Những gì cốt lõi nhất thì vô hình trước mắt trần.
— Những gì cốt lõi nhất thì vô hình trước mắt trần — hoàng tử bé nhắc lại để ghi nhớ thật sâu trong tâm khảm.
— Chính khoảng thời gian mà cậu đã bỏ ra cho bông hồng của cậu mới làm cho bông hồng của cậu trở nên quan trọng đến thế.
— Chính khoảng thời gian tôi dành cho bông hồng... — hoàng tử bé lặp lại.
— Cậu phải có trách nhiệm mãi mãi với những gì cậu đã thuần hóa. Cậu có trách nhiệm với bông hồng của mình.`,
      },
    ],
  },
  {
    id: 'sherlock-holmes',
    title: 'Sherlock Holmes: Vụ Án Dải Băng Đốm',
    author: 'Arthur Conan Doyle',
    description: 'Một trong những vụ án ly kỳ và xuất sắc nhất của thám tử lừng danh Sherlock Holmes và bác sĩ Watson tại số 221B phố Baker.',
    source: 'builtin',
    chapters: [
      {
        id: 'sh-chap-1',
        title: 'Chương 1: Người khách lạ lúc sáng sớm',
        order: 1,
        source: 'builtin',
        content: `Khi nhìn lại những ghi chép về bảy mươi vụ án kỳ lạ mà tôi đã có dịp theo dõi các phương pháp điều tra của người bạn Sherlock Holmes trong suốt tám năm qua, tôi thấy có nhiều vụ bi thương, một số vụ hài hước, phần lớn là kỳ dị, nhưng không có vụ nào tầm thường.

Đó là vào một buổi sáng đầu tháng Tư năm 1883, tôi tỉnh dậy và thấy Sherlock Holmes đang đứng cạnh giường tôi, đã ăn mặc chỉnh tề. Anh là người thường thức dậy muộn, và chiếc đồng hồ trên lò sưởi chỉ mới bảy giờ mười lăm. Tôi ngạc nhiên nhìn anh, có phần trách móc vì anh đã phá vỡ giấc ngủ ngon lành của tôi.

— Rất tiếc vì đã đánh thức cậu dậy, Watson, — anh nói, — nhưng sáng nay có một biến cố chung cho cả hai chúng ta. Bà Hudson đã thức dậy, bị một người phụ nữ lạ mặt gõ cửa gọi, và người ấy hiện đang ngồi chờ chúng ta trong phòng khách.
— Ai thế? Một thân chủ à?
— Đúng vậy, một thiếu nữ trẻ tuổi đang trong trạng thái vô cùng kích động. Cô ấy tha thiết đòi gặp tôi ngay lập tức. Khi một phụ nữ trẻ chịu lặn lội đến tận phố Baker vào giờ này giữa tiết trời se lạnh, thì tôi dám chắc câu chuyện cô ấy mang đến không hề tầm thường. Nếu là một vụ án thú vị, tôi nghĩ cậu hẳn không muốn bỏ lỡ ngay từ những phút dạo đầu.

Tôi vội vàng mặc quần áo và chỉ mất vài phút để sẵn sàng theo Holmes xuống phòng khách.

Một người phụ nữ mặc đồ đen, trùm khăn voan dày đang ngồi bên khung cửa sổ. Khi chúng tôi bước vào, cô đứng dậy.
— Chào buổi sáng, thưa cô, — Holmes vui vẻ nói. — Tôi là Sherlock Holmes. Còn đây là người bạn thân và là đồng nghiệp của tôi, Bác sĩ Watson. Cô có thể hoàn toàn yên tâm chia sẻ mọi điều trước mặt anh ấy. Kìa, tôi thấy cô đang run rẩy. Hãy ngồi lại gần lò sưởi, và tôi sẽ bảo người mang đến một tách cà phê nóng cho cô.
— Tôi run rẩy không phải vì lạnh, thưa ông Holmes, — người phụ nữ khẽ nói, vừa vén tấm mạng che mặt lên. — Tôi run rẩy vì nỗi sợ hãi tột cùng đang bóp nghẹt tâm can tôi!`,
      },
      {
        id: 'sh-chap-2',
        title: 'Chương 2: Thảm kịch tại dinh thự Stoke Moran',
        order: 2,
        source: 'builtin',
        content: `Khuôn mặt của cô gái tái nhợt và hốc hác, đôi mắt bồn chồn lo sợ như mắt một con thú đang bị săn đuổi. Dù tuổi đời chỉ khoảng ba mươi, nhưng mái tóc cô đã lấm tấm hoa râm trước tuổi.

Holmes nhìn cô bằng ánh mắt quan sát sắc bén quen thuộc:
— Cô không cần phải sợ hãi, — anh vỗ về, khẽ cúi người về phía trước. — Chúng tôi sẽ nhanh chóng làm sáng tỏ mọi nỗi hiểm nguy đe dọa cô. Tôi thấy cô đến đây bằng xe lửa sáng nay, xuất phát từ hướng Waterloo.
Cô gái giật mình mở to mắt:
— Sao ông có thể biết được điều đó?
— Vé xe lửa khứ hồi kẹp trong lòng bàn tay trái của cô mách bảo tôi điều ấy. Và vệt bùn bắn trên cánh tay áo khoác bên trái cho thấy cô đã đi trên một cỗ xe ngựa mui trần dọc theo những con đường quê lầy lội trước khi tới nhà ga.
— Ông đoán đúng từng chi tiết, — cô gái thở dài một cách nhẹ nhõm. — Tên tôi là Helen Stoner. Tôi hiện đang sống cùng người cha dượng, bác sĩ Grimesby Roylott, hậu duệ cuối cùng của dòng họ Roylott lừng lẫy xứ Stoke Moran thuộc hạt Surrey.

Cô bắt đầu kể về gia đình mình:
— Dòng họ Roylott từng là một trong những gia tộc giàu có nhất nước Anh, nhưng qua nhiều thế hệ phung phí, gia sản đã suy tàn hoàn toàn. Cha dượng tôi từng sang Ấn Độ hành nghề y, cưới mẹ tôi tại đó. Khi mẹ tôi qua đời trong một tai nạn đường sắt, bà để lại toàn bộ tài sản cho ông quản lý, với điều kiện trích một khoản tiền hồi môn đáng kể cho hai chị em tôi khi chúng tôi kết hôn.

— Và chuyện gì đã xảy ra với người chị gái song sinh của cô? — Holmes hỏi.
— Chị gái tôi, Julia, đã qua đời một cách bí ẩn và khủng khiếp đúng hai năm trước, chỉ hai tuần trước ngày tổ chức đám cưới của chị ấy!`,
      },
      {
        id: 'sh-chap-3',
        title: 'Chương 3: Tiếng huýt sáo lúc nửa đêm',
        order: 3,
        source: 'builtin',
        content: `Helen Stoner lấy tay che mặt, đôi vai cô run lên bần bật khi ký ức kinh hoàng ùa về.

— Đêm hôm đó, chị Julia bước sang phòng tôi nói chuyện muộn. Khi chuẩn bị về phòng ngủ, chị ấy chợt hỏi tôi: "Helen, em có bao giờ nghe thấy tiếng huýt sáo lạ lùng vào lúc ba giờ sáng không?". Tôi trả lời là không. Chị ấy bảo mấy đêm gần đây, cứ đến độ ba giờ sáng là lại có một tiếng huýt sáo khe khẽ nhưng rất rõ vọng lại.

Đêm đó, tôi không tài nào chợp mắt nổi. Ngoài trời gió gào thét dữ dội. Đột nhiên, giữa tiếng gió rít, một tiếng thét thất thanh của phụ nữ xé toang màn đêm u tối. Đó chính là giọng của chị tôi!

Tôi lao ra hành lang. Cửa phòng chị tôi bật mở, và chị Julia loạng choạng bước ra, hai tay ôm chặt lấy đầu, gương mặt biến dạng vì kinh hoàng tột độ. Chị ngã khuỵu xuống sàn. Khi tôi ôm lấy chị, chị chỉ tay về phía phòng cha dượng và thều thào bằng giọng đứt quãng:
"Helen! Ôi trời ơi, Helen! Dải băng! Dải băng đốm!"

Chị tôi chỉ nói được đến đó rồi ngất lịm, và qua đời ngay trước khi bác sĩ kịp tới nơi. Cảnh sát đã khám nghiệm kỹ lưỡng nhưng không tìm thấy bất kỳ dấu hiệu đầu độc hay bạo lực nào. Cửa sổ phòng chị đóng then cài từ bên trong, lò sưởi quá hẹp để có người chui qua. Cái chết của chị trở thành một ẩn số không lời giải.

Helen nghẹn ngào tiếp lời:
— Nhưng thưa ông Holmes, hai ngày trước, tôi vừa đồng ý lời cầu hôn của một người bạn. Hôm qua, cha dượng tôi viện cớ sửa chữa cánh tây ngôi nhà và bắt tôi chuyển sang ngủ đúng căn phòng mà chị gái tôi từng trút hơi thở cuối cùng! Và đêm qua, vào lúc ba giờ sáng... tôi lại nghe thấy tiếng huýt sáo ma quái đó!`,
      },
      {
        id: 'sh-chap-4',
        title: 'Chương 4: Sự thật phơi bày',
        order: 4,
        source: 'builtin',
        content: `Sherlock Holmes lập tức nhận vụ án. Chiều hôm đó, chúng tôi bí mật đón tàu tới trang viên Stoke Moran.

Khám xét căn phòng định mệnh, Holmes phát hiện ba điểm bất thường then chốt:
1. Chiếc dây chuông gọi người hầu treo sát đầu giường thực chất là một sợi dây giả, không nối với bất kỳ cái chuông nào, mà gắn vào một lỗ thông hơi nhỏ đục xuyên sang phòng của bác sĩ Roylott.
2. Chiếc giường ngủ bị bắt vít chết xuống sàn nhà, khiến nó không thể di chuyển khỏi vị trí thẳng đứng ngay dưới lỗ thông hơi và sợi dây chuông.
3. Trong phòng của bác sĩ Roylott có một chiếc két sắt nhỏ, một chiếc đĩa đựng sữa tươi và một sợi roi da ngắn thắt thòng lọng ở đầu.

Đêm hôm đó, tôi và Holmes bí mật phục kích trong bóng tối ngay trong căn phòng của Helen Stoner.

Khoảng ba giờ sáng, một tia sáng mờ le lói qua lỗ thông gió. Ngay sau đó là tiếng xì xì rất nhỏ như tiếng hơi nước thoát ra từ ấm đun. Holmes bật dậy, châm que diêm và dùng cây gậy ba-toong đập tới tấp vào sợi dây chuông gọi người hầu!

— Cậu có thấy nó không, Watson? Cậu có thấy nó không? — anh hét lên.
Đột nhiên, từ phòng bên cạnh vang lên một tiếng thét ghê rợn, man dại nhất mà tôi từng nghe thấy trong đời. Khi chúng tôi xông vào phòng bác sĩ Roylott, người đàn ông độc ác ấy đang ngồi bất động trên ghế, mắt trợn trừng nhìn lên trần nhà. Quấn quanh trán ông ta là một dải băng màu vàng lốm đốm những chấm nâu sẫm.

— Dải băng đốm! — Holmes thì thầm. — Một con rắn đầm lầy xứ Ấn Độ, loài rắn độc bậc nhất thế giới! Nọc độc của nó giết người trong mười giây mà không để lại dấu vết. Roylott đã huấn luyện nó chui qua lỗ thông gió, bò theo dây chuông xuống giường nạn nhân và gọi nó quay về bằng tiếng huýt sáo cùng đĩa sữa. Khi bị tôi xua đuổi bằng những đòn roi, con rắn đã quay trở lại và cắn chết chính kẻ nuôi dưỡng nó!`,
      },
    ],
  },
  {
    id: 'de-men-phieu-luu-ky',
    title: 'Dế Mèn Phiêu Lưu Ký',
    author: 'Tô Hoài',
    description: 'Truyện dài thiếu nhi kinh điển của văn học Việt Nam về bài học trưởng thành và khát vọng hòa bình muôn loài của Dế Mèn.',
    source: 'builtin',
    chapters: [
      {
        id: 'dm-chap-1',
        title: 'Chương 1: Bài học đường đời đầu tiên',
        order: 1,
        source: 'builtin',
        content: `Tôi sống độc lập từ thuở bé. Ấy là tục lệ lâu đời trong họ nhà dế chúng tôi. Mẹ tôi chỉ nuôi chúng tôi ba hôm. Đến hôm thứ ba, mẹ dẫn chúng tôi đi quanh bờ ruộng, chỉ cho mỗi đứa một hang đất nhỏ và bảo: "Từ nay các con hãy tự lo lấy thân!".

Tôi là một chú dế khỏe mạnh, đôi càng mẫm bóng, những cái vuốt ở chân cứ cứng dần và nhọn hoắt. Thỉnh thoảng, muốn thử sự lợi hại của những chiếc vuốt, tôi co cẳng lên, đạp phanh phách vào các ngọn cỏ. Những ngọn cỏ gãy rạp, y như có nhát dao vừa lia qua. Đôi cánh tôi, trước kia ngắn hủn hoẳn, bây giờ đã thành cái áo dài kín xuống tận đuôi. Mỗi khi tôi vũ lên, đã nghe tiếng phành phạch giòn giã.

Lúc tôi bách bộ thì cả người tôi rung rinh một màu nâu bóng mỡ soi gương được và rất ưa nhìn. Đầu tôi to ra và nổi từng tảng, rất bướng. Hai cái răng đen nhánh lúc nào cũng nhai ngoàm ngoạp như hai lưỡi cưa máy làm việc. Sợi râu tôi dài và uốn cong một vẻ rất đỗi hùng dũng.

Tôi lấy làm hãnh diện với bà con về cặp râu ấy lắm. Cứ chốc chốc tôi lại trịnh trọng và khoan thai đưa cả hai chân trước lên vuốt râu.

Tôi đi đứng oai vệ. Mỗi bước đi, tôi làm điệu dún dẩy các khoeo chân, rung lên rung xuống hai chiếc râu. Cho cả tôi là một bậc trượng phu kỳ vĩ!`,
      },
      {
        id: 'dm-chap-2',
        title: 'Chương 2: Nỗi ân hận khôn nguôi bên mộ Dế Choắt',
        order: 2,
        source: 'builtin',
        content: `Bên cạnh hang tôi có một anh Dế Choắt. Người gầy gò, dài ngoẵng như một gã nghiện thuốc phiện. Cánh thì ngắn củn đến giữa lưng, hở cả mạng sườn như người cởi trần mặc áo gi-lê. Đôi càng bè bè, nặng nề, trông đến xấu xí.

Một chiều nọ, thấy chị Cốc béo tròn đang đứng rỉa lông rỉa cánh bên bờ đầm, tôi nảy ra ý định trêu chị Cốc để khoe mẽ sự bạo dạn của mình. Dế Choắt can ngăn:
— Thôi anh ạ, em xin anh! Chị Cốc dữ lắm, trêu vào là mang họa đấy!
Tôi cười khẩy:
— Chú mày nhát như thỏ đế. Xem tao đây này!

Nói rồi tôi cất giọng véo von hát một câu xấc xược chửi chị Cốc. Hát xong, tôi lủi ngay vào tận đáy hang sâu, nằm bắt chân chữ ngũ rung đùi khoái trá.

Chị Cốc nghe thấy, tức lộn ruột, đảo mắt tìm quanh. Thấy Dế Choắt đang ngơ ngác đứng trước cửa hang bên cạnh, chị Cốc nghĩ ngay là Choắt hát trêu mình. Chị sà xuống, mổ lia lịa từng nhát mỏ như búa bổ vào lưng Choắt. Choắt chỉ kịp kêu mấy tiếng thảm thiết rồi nằm quằn quại.

Khi chị Cốc bay đi rồi, tôi mới mon men bò sang. Dế Choắt thoi thóp thở, trước khi nhắm mắt, Choắt đã nói với tôi một câu khiến tôi ân hận suốt cả một đời:
— Ở đời mà có thói hung hăng bậy bạ, có óc mà không biết nghĩ, sớm muộn rồi cũng mang vạ vào mình đấy!

Tôi đứng lặng hồi lâu trước nấm mồ của Dế Choắt, lòng xót xa và ân hận tột cùng. Đó là bài học đường đời đầu tiên thấm thía của tôi.`,
      },
      {
        id: 'dm-chap-3',
        title: 'Chương 3: Kết nghĩa anh em cùng Dế Trũi',
        order: 3,
        source: 'builtin',
        content: `Rời bỏ quê nhà thân thương, tôi bắt đầu cuộc hành trình phiêu lưu rộng lớn khắp bốn phương trời.

Trên đường đi, tôi tình cờ bắt gặp một vụ ức hiếp bất công. Một toán Bọ Muỗm dữ tợn đang vây đánh một chú Dế Trũi cô độc. Trũi bị đánh tơi tả nhưng vẫn kiên cường chống trả không chịu lùi bước. Máu hiệp nghĩa nổi lên, tôi nhảy bổ vào vòng chiến, vung đôi càng sắc bén đạp phanh phách làm toán Bọ Muỗm khiếp vía chạy tán loạn.

Dế Trũi thoát nạn, xúc động nắm chặt lấy chân tôi:
— Cảm ơn người anh em trượng nghĩa! Nếu không có anh, hôm nay Trũi này đã nát thây dưới tay lũ giặc cỏ kia rồi!
Tôi đỡ Trũi dậy:
— Chuyện bất bình giữa đường thấy thì phải ra tay, hà tất phải tạ ơn!

Hai chúng tôi chuyện trò hợp ý nhau lạ lùng. Trũi là người bộc trực, can đảm, trọng nghĩa khinh tài. Chúng tôi bèn làm lễ kết nghĩa anh em, thề cùng nhau đồng cam cộng khổ, chia ngọt sẻ bùi trên con đường thiên lý. Từ đó, tôi và Trũi cùng đồng hành qua bao đồng cỏ xanh tươi, cùng ngắm nhìn trăng thanh gió mát và ước mơ về một thế giới muôn loài cùng chung sống hòa thuận.`,
      },
    ],
  },
];
