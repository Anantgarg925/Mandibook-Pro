import re

with open('src/app/bills/[id].tsx', 'r') as f:
    content = f.read()

# Import useMutation and useQueryClient
content = content.replace(
    "import { useQuery } from '@tanstack/react-query';",
    "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';"
)

content = content.replace(
    "import { ArrowLeft, FileText, Pencil } from 'lucide-react-native';",
    "import { ArrowLeft, FileText, Pencil, CheckCircle } from 'lucide-react-native';"
)

# Add STATUS_COLOR for DELIVERED
content = content.replace(
    "PENDING: Colors.warning,\n  CONFIRMED: Colors.success,\n  CANCELLED: Colors.danger,",
    "PENDING: Colors.warning,\n  DELIVERED: Colors.info,\n  CONFIRMED: Colors.success,\n  CANCELLED: Colors.danger,"
)

# Inside BillDetailScreen
init_vars = """
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shop } = useShop();
  const isMemberMode = useMemberMode();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
"""
content = re.sub(r'const router = useRouter\(\);[\s\S]*?const insets = useSafeAreaInsets\(\);', init_vars.strip(), content)

# Add markDeliveredMutation
mutation_str = """
  const markDeliveredMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('inquiries')
        .update({ status: 'DELIVERED' })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiry', shop?.shopId, id] });
    }
  });
"""

content = re.sub(
    r'(const \{ data: inquiry \} = useQuery\(\{)',
    mutation_str + r'\n  \1',
    content
)

# Render Mark as Delivered Button
delivered_btn = """
        {isMemberMode === true && inquiry.status === 'PENDING' ? (
          <Pressable
            testID="mark-delivered-button"
            onPress={() => markDeliveredMutation.mutate()}
            disabled={markDeliveredMutation.isPending}
          >
            {({ pressed }) => (
              <View style={{
                height: 52,
                borderRadius: Radius.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: pressed || markDeliveredMutation.isPending ? '#2563EB' : Colors.info,
              }}>
                <CheckCircle size={18} color="#FFF" />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                  style={{ fontSize: FontSize.md, fontWeight: '700', color: '#FFF' }}
                >
                  {markDeliveredMutation.isPending ? 'Marking...' : 'Mark as Delivered / डिलीवर करें'}
                </Text>
              </View>
            )}
          </Pressable>
        ) : null}
"""

content = content.replace(
    '{isMemberMode === true && inquiry.status === \'PENDING\' ? (',
    delivered_btn + '\n        {isMemberMode === true && inquiry.status === \'PENDING\' ? ('
)

with open('src/app/bills/[id].tsx', 'w') as f:
    f.write(content)
