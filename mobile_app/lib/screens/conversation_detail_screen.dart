import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// One Conversation thread with a company Employee — see [MessagesScreen].
class ConversationDetailScreen extends StatelessWidget {
  const ConversationDetailScreen({super.key, required this.title});

  final String title;

  static const _messages = [
    (fromCompany: true, text: 'Chào bạn, mình có thể hỗ trợ gì cho bạn ạ?'),
    (fromCompany: false, text: 'Sản phẩm này còn màu đen size L không ạ?'),
    (fromCompany: true, text: 'Dạ còn hàng bạn nhé, bên mình sẽ giao trong 2-3 ngày.'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, i) {
                final m = _messages[i];
                return Align(
                  alignment: m.fromCompany ? Alignment.centerLeft : Alignment.centerRight,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    constraints: const BoxConstraints(maxWidth: 260),
                    decoration: BoxDecoration(
                      color: m.fromCompany ? AppColors.surface : AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: const [BoxShadow(color: Color(0x14141414), blurRadius: 6, offset: Offset(0, 2))],
                    ),
                    child: Text(m.text, style: const TextStyle(fontSize: 13.5)),
                  ),
                );
              },
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      decoration: InputDecoration(
                        hintText: 'Nhập tin nhắn... (demo, chưa gửi được)',
                        filled: true,
                        fillColor: AppColors.background,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: BorderSide.none),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Material(
                    color: AppColors.primary,
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Demo — chưa nối gửi tin nhắn thật')),
                      ),
                      child: const SizedBox(width: 44, height: 44, child: Icon(Icons.send_rounded, color: Colors.white, size: 18)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
