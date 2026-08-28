import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or self.user.is_anonymous:
            # Reject connection if user is not authenticated
            await self.close()
            return
        
        # Create a unique group name for this user based on their ID
        self.group_name = f"user_{self.user.id}"

        # Join the group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            # Leave the group
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    # Receive message from room group
    async def notification_message(self, event):
        message = event['message']
        notification_type = event.get('notification_type', 'notification')

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': notification_type,
            'message': message
        }))
