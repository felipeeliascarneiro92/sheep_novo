
import { supabase } from './supabase';
import { AuditLog, AuditActionType } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AuditActor {
    id: string;
    name: string;
    role: string;
}

export const logAction = async (
    actor: AuditActor,
    actionType: AuditActionType,
    category: string,
    details: string,
    metadata?: Record<string, any>
) => {
    const newLog: AuditLog = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        actorId: actor.id,
        actorName: actor.name,
        role: actor.role || 'Sistema',
        actionType,
        category,
        details,
        metadata
    };

    // Map to snake_case for Supabase
    const dbLog = {
        id: newLog.id,
        timestamp: newLog.timestamp,
        actor_id: newLog.actorId,
        actor_name: newLog.actorName,
        role: newLog.role,
        action_type: newLog.actionType,
        category: newLog.category,
        details: newLog.details,
        metadata: newLog.metadata
    };

    const { error } = await supabase.from('audit_logs').insert([dbLog]);
    if (error) {
        console.error('Error logging action:', error);
    }
};

export const getAuditLogs = async (): Promise<AuditLog[]> => {
    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);

    if (error) {
        console.error('Error fetching audit logs:', error);
        return [];
    }

    // Map back to camelCase
    return data.map((log: any) => ({
        id: log.id,
        timestamp: log.timestamp,
        actorId: log.actor_id,
        actorName: log.actor_name,
        role: log.role,
        actionType: log.action_type,
        category: log.category,
        details: log.details,
        metadata: log.metadata
    }));
};
