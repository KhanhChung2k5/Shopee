import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'conversation_detail_screen.dart';

/// Chat threads with the company's own support staff (single-brand model —
/// see crm-ecommerce-class-diagram.md v6). Each thread maps to a Conversation
/// with an Employee (department = "cs"), not a third-party shop.
class MessagesScreen extends StatelessWidget {
  const MessagesScreen({super.key});

  static const _conversations = [
    (title: 'Chăm sóc khách hàng', lastMessage: 'Dạ còn hàng bạn nhé, bên mình sẽ giao trong 2-3 ngày.', time: '10 phút', unread: 2),
    (title: 'Bộ phận Đổi trả & Bảo hành', lastMessage: 'Yêu cầu đổi trả của bạn đã được duyệt ạ.', time: '2 giờ', unread: 0),
    (title: 'Nhân viên Minh Anh (CSKH)', lastMessage: 'Bạn ơi đơn hàng đã được giao thành công chưa ạ?', time: '1 ngày', unread: 0),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tin nhắn')),
      body: ListView.separated(
        itemCount: _conversations.length,
        separatorBuilder: (_, __) => const Divider(height: 1, color: AppColors.border),
        itemBuilder: (context, i) {
          final c = _conversations[i];
          return ListTile(
            leading: CircleAvatar(
              backgroundColor: AppColors.primaryLight,
              child: Text(c.title.substring(0, 1), style: const TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.w700)),
            ),
            title: Text(c.title, style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(c.lastMessage, maxLines: 1, overflow: TextOverflow.ellipsis),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(c.time, style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                if (c.unread > 0) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                    decoration: const BoxDecoration(color: AppColors.urgent, shape: BoxShape.circle),
                    constraints: const BoxConstraints(minWidth: 18),
                    child: Text('${c.unread}', textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 11)),
                  ),
                ],
              ],
            ),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => ConversationDetailScreen(title: c.title)),
            ),
          );
        },
      ),
    );
  }
}
