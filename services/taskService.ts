
import { supabase } from './supabase';
import { Task, TaskStatus, TaskComment, EditingRequest, EditingStatus, Booking } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { notifyClientEditingCompleted } from './notificationService';
import { getClientById } from './clientService';

// --- TASKS ---
interface TaskRule {
    check: (booking: Booking) => boolean;
    createTask: (booking: Booking) => Omit<Task, 'id' | 'createdAt' | 'status' | 'comments'>;
}

const TASK_GENERATION_RULES: TaskRule[] = [
    {
        check: (b) => {
            const videoServices = ['pacote_completo', 'video_reels', 'video_profissional_interno', 'video_aereo', 'pacote_aereo'];
            return b.service_ids.some(id => videoServices.includes(id));
        },
        createTask: (b) => {
            const heavyVideoServices = ['pacote_completo', 'video_profissional_interno', 'video_aereo', 'pacote_aereo'];
            const hasHeavyVideo = b.service_ids.some(id => heavyVideoServices.includes(id));
            const payout = hasHeavyVideo ? 40.00 : 20.00;
            const title = hasHeavyVideo ? `Edição de Vídeo Completa - ${b.client_name}` : `Edição de Reels - ${b.client_name}`;
            const bookingDate = new Date(b.date?.replace(/-/g, '/') || new Date());
            const dueDate = new Date(bookingDate);
            dueDate.setDate(bookingDate.getDate() + 3);
            return { bookingId: b.id, title: title, description: 'Edição conforme solicitado no agendamento.', assigneeName: 'Editor', payout: payout, relatedServiceId: 'video_edit', dueDate: dueDate.toISOString().split('T')[0] }
        }
    },
    {
        check: (b) => b.client_name.includes('Lider') || b.client_id === 'client_2',
        createTask: (b) => ({ bookingId: b.id, title: `Upload Sistema Vista - ${b.address}`, description: 'Subir fotos e preencher ficha no sistema externo da imobiliária.', assigneeName: 'Reidiane', payout: 10.00, relatedServiceId: 'upload_external' })
    },
    {
        check: (b) => b.service_ids.includes('foto_aerea') && !b.service_ids.some(id => id.includes('video') || id === 'pacote_completo'),
        createTask: (b) => ({ bookingId: b.id, title: `Tratamento de Fotos Aéreas`, description: 'Ajuste de horizonte e cores.', assigneeName: 'Editor', payout: 15.00 })
    }
];

export const getTasks = async (): Promise<Task[]> => {
    const { data: tasks, error } = await supabase.from('tasks').select(`
        *,
        task_comments (*)
    `);

    if (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }

    return tasks.map((t: any) => ({
        id: t.id,
        bookingId: t.booking_id,
        title: t.title,
        description: t.description,
        status: t.status,
        assigneeName: t.assignee_name,
        payout: t.payout,
        dueDate: t.due_date,
        createdAt: t.created_at,
        completedAt: t.completed_at,
        relatedServiceId: t.related_service_id,
        isPaid: t.is_paid,
        payoutDate: t.payout_date,
        comments: t.task_comments.map((c: any) => ({
            id: c.id,
            text: c.text,
            author: c.author,
            createdAt: c.created_at
        }))
    }));
};

// NEW: Create Task Manually
export const addTask = async (data: Omit<Task, 'id' | 'createdAt' | 'status' | 'comments'>): Promise<Task | null> => {
    const newTask = {
        id: uuidv4(),
        booking_id: data.bookingId || null,
        title: data.title,
        description: data.description,
        status: 'Pendente',
        assignee_name: data.assigneeName,
        payout: data.payout,
        due_date: data.dueDate,
        related_service_id: data.relatedServiceId,
        created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('tasks').insert([newTask]);

    if (error) {
        console.error('Error adding task:', error);
        return null;
    }

    return {
        ...data,
        id: newTask.id,
        createdAt: newTask.created_at,
        status: 'Pendente',
        comments: []
    };
};

// NEW: Update Task
export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task | null> => {
    const dbUpdates: any = {};
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.assigneeName) dbUpdates.assignee_name = updates.assigneeName;
    if (updates.payout) dbUpdates.payout = updates.payout;
    if (updates.dueDate) dbUpdates.due_date = updates.dueDate;
    if (updates.completedAt) dbUpdates.completed_at = updates.completedAt;

    const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', taskId);

    if (error) {
        console.error('Error updating task:', error);
        return null;
    }
    // Return partial for now or fetch fresh
    return { id: taskId, ...updates } as Task;
};

// NEW: Delete Task
export const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) console.error('Error deleting task:', error);
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus): Promise<Task | null> => {
    const updates: any = { status };
    if (status === 'Concluído') {
        updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
    if (error) {
        console.error('Error updating task status:', error);
        return null;
    }
    return { id: taskId, status } as Task; // Partial return
}

export const addTaskComment = async (taskId: string, text: string, author: string): Promise<Task | null> => {
    const newComment = {
        id: uuidv4(),
        task_id: taskId,
        text,
        author,
        created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('task_comments').insert([newComment]);
    if (error) {
        console.error('Error adding comment:', error);
        return null;
    }

    // Fetch updated task with comments
    const { data: task, error: fetchError } = await supabase.from('tasks').select(`
        *,
        task_comments (*)
    `).eq('id', taskId).single();

    if (fetchError || !task) {
        console.error('Error fetching updated task:', fetchError);
        return null;
    }

    return {
        id: task.id,
        bookingId: task.booking_id,
        title: task.title,
        description: task.description,
        status: task.status,
        assigneeName: task.assignee_name,
        payout: task.payout,
        dueDate: task.due_date,
        createdAt: task.created_at,
        completedAt: task.completed_at,
        relatedServiceId: task.related_service_id,
        comments: task.task_comments.map((c: any) => ({
            id: c.id,
            text: c.text,
            author: c.author,
            createdAt: c.created_at
        }))
    };
}

export const generateTasksFromBooking = async (booking: Booking) => {
    // Check if tasks already exist for this booking
    const { data: existing } = await supabase.from('tasks').select('id').eq('booking_id', booking.id);
    if (existing && existing.length > 0) return;

    const tasksToInsert: any[] = [];

    TASK_GENERATION_RULES.forEach(rule => {
        if (rule.check(booking)) {
            const taskData = rule.createTask(booking);
            tasksToInsert.push({
                id: `task-${uuidv4().slice(0, 8)}`,
                booking_id: taskData.bookingId,
                title: taskData.title,
                description: taskData.description,
                status: 'Pendente',
                assignee_name: taskData.assigneeName,
                payout: taskData.payout,
                due_date: taskData.dueDate,
                related_service_id: taskData.relatedServiceId,
                created_at: new Date().toISOString()
            });
        }
    });

    if (tasksToInsert.length > 0) {
        const { error } = await supabase.from('tasks').insert(tasksToInsert);
        if (error) console.error('Error generating tasks:', error);
    }
};

// --- EDITING REQUESTS ---
export const getEditingRequests = async (): Promise<EditingRequest[]> => {
    const { data, error } = await supabase.from('editing_requests').select(`
        *,
        editing_request_items (*)
    `);

    if (error) {
        console.error('Error fetching editing requests:', error);
        return [];
    }

    return data.map((r: any) => ({
        id: r.id,
        clientId: r.client_id,
        createdAt: r.created_at,
        status: r.status,
        totalPrice: r.total_price,
        editorNotes: r.editor_notes,
        completedAt: r.completed_at,
        items: r.editing_request_items.map((i: any) => ({
            id: i.id,
            originalFileName: i.original_file_name,
            originalFileUrl: i.original_file_url,
            serviceIds: i.service_ids,
            instructions: i.instructions,
            editedFileUrl: i.edited_file_url
        }))
    }));
};

export const createEditingRequest = async (clientId: string, items: any[], totalPrice: number) => {
    const requestId = uuidv4();
    const newRequest = {
        id: requestId,
        client_id: clientId,
        created_at: new Date().toISOString(),
        status: 'Pendente',
        total_price: totalPrice
    };

    const { error: reqError } = await supabase.from('editing_requests').insert([newRequest]);
    if (reqError) {
        console.error('Error creating editing request:', reqError);
        return;
    }

    const newItems = items.map(i => ({
        id: uuidv4(),
        request_id: requestId,
        original_file_name: i.originalFileName,
        original_file_url: i.originalFileUrl,
        service_ids: i.serviceIds,
        instructions: i.instructions
    }));

    const { error: itemError } = await supabase.from('editing_request_items').insert(newItems);
    if (itemError) console.error('Error creating editing items:', itemError);
};

export const updateEditingRequestStatus = async (id: string, status: EditingStatus, editorNotes?: string) => {
    const updates: any = { status };
    if (editorNotes !== undefined) {
        updates.editor_notes = editorNotes;
    }

    const { error } = await supabase.from('editing_requests').update(updates).eq('id', id);
    if (error) console.error('Error updating editing request status:', error);

    if (status === 'Concluído') {
        const { data: request } = await supabase.from('editing_requests').select('*').eq('id', id).single();
        if (request) {
            const client = await getClientById(request.client_id);
            if (client) {
                notifyClientEditingCompleted(request, client.name, client.phone);
            }
        }
    }
};

export const uploadEditedImage = async (requestId: string, itemId: string, url: string) => {
    const { error } = await supabase.from('editing_request_items').update({ edited_file_url: url }).eq('id', itemId);
    if (error) console.error('Error uploading edited image:', error);
};

// --- PAYROLL ---
export interface PendingEditorPayout {
    editorName: string;
    tasks: Task[];
    totalPending: number;
}

export const calculatePendingEditorPayouts = async (): Promise<PendingEditorPayout[]> => {
    // Fetch tasks that are completed but NOT paid
    // Note: We use .is('is_paid', null) OR .eq('is_paid', false) to be safe if default is null
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'Concluído')
        .or('is_paid.is.null,is_paid.eq.false');

    if (error) {
        console.error('Error fetching pending tasks:', error);
        return [];
    }

    const mappedTasks: Task[] = tasks.map((t: any) => ({
        id: t.id,
        bookingId: t.booking_id,
        title: t.title,
        description: t.description,
        status: t.status,
        assigneeName: t.assignee_name,
        payout: t.payout,
        dueDate: t.due_date,
        createdAt: t.created_at,
        completedAt: t.completed_at,
        relatedServiceId: t.related_service_id,
        isPaid: t.is_paid,
        payoutDate: t.payout_date,
        comments: []
    }));

    const payoutsMap: Record<string, PendingEditorPayout> = {};

    mappedTasks.forEach((task) => {
        const name = task.assigneeName || 'Não Atribuído';
        if (!payoutsMap[name]) {
            payoutsMap[name] = {
                editorName: name,
                tasks: [],
                totalPending: 0
            };
        }
        payoutsMap[name].tasks.push(task);
        payoutsMap[name].totalPending += (task.payout || 0);
    });

    return Object.values(payoutsMap);
};

export const processEditorPayout = async (taskIds: string[]) => {
    const { error } = await supabase
        .from('tasks')
        .update({ is_paid: true, payout_date: new Date().toISOString() })
        .in('id', taskIds);

    if (error) throw error;
};
