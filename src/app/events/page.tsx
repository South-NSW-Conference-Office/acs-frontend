'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { PermissionGate } from '@/components/PermissionGate';
import Button from '@/components/Button';
import EventModal from '@/components/EventModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useToast } from '@/contexts/ToastContext';
import { eventsAPI, EventListItem } from '@/lib/eventsAPI';
import {
  CalendarIcon,
  MapPinIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { TrashIcon } from '@heroicons/react/24/outline';
import { RowActionsMenu } from '@/components/RowActionsMenu';

export default function Events() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<EventListItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventListItem | null>(null);
  const [services, setServices] = useState<Array<{ _id: string; name: string; type: string }>>([]);
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const filters = {
        search: searchQuery || undefined,
        serviceId: serviceFilter || undefined
      };
      const eventsData = await eventsAPI.getAllEvents(filters);
      setEvents(eventsData);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      showErrorToast('Failed to load events', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, serviceFilter, showErrorToast]);

  const fetchServices = useCallback(async () => {
    try {
      const servicesData = await eventsAPI.getServicesForDropdown();
      setServices(servicesData);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleEventSaved = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedEvent(null);
    fetchEvents();
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;

    try {
      await eventsAPI.deleteEvent(eventToDelete._id);
      showSuccessToast('Event deleted successfully');
      setShowDeleteConfirm(false);
      setEventToDelete(null);
      fetchEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
      showErrorToast('Failed to delete event', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const getEventStatus = (event: EventListItem) => {
    const now = new Date();
    const start = new Date(event.start);
    const end = new Date(event.end);

    if (now < start) {
      return { status: 'upcoming', color: 'blue' };
    } else if (now >= start && now <= end) {
      return { status: 'active', color: 'green' };
    } else {
      return { status: 'completed', color: 'gray' };
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Event Name',
      accessor: (event: EventListItem) => (
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded flex-shrink-0 bg-orange-100 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-[#F5821F]" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{event.name}</p>
            {event.description && (
              <p className="text-sm text-gray-500 truncate">{event.description}</p>
            )}
          </div>
        </div>
      ),
      className: 'px-6 py-4'
    },
    {
      key: 'service',
      header: 'Service',
      accessor: (event: EventListItem) => (
        <div>
          <p className="font-medium text-gray-900">{event.service.name}</p>
          <p className="text-sm text-gray-500">{event.service.type}</p>
        </div>
      ),
      className: 'px-6 py-4'
    },
    {
      key: 'datetime',
      header: 'Date & Time',
      accessor: (event: EventListItem) => {
        const startTime = formatDateTime(event.start);
        const endTime = formatDateTime(event.end);
        const isSameDay = event.start.split('T')[0] === event.end.split('T')[0];

        return (
          <div>
            <p className="font-medium text-gray-900">{startTime.date}</p>
            <p className="text-sm text-gray-500">
              {startTime.time}
              {isSameDay ? ` - ${endTime.time}` : ` - ${endTime.date} ${endTime.time}`}
            </p>
          </div>
        );
      },
      className: 'px-6 py-4'
    },
    {
      key: 'location',
      header: 'Location',
      accessor: (event: EventListItem) => (
        <div className="flex items-center space-x-1">
          <MapPinIcon className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900">{event.locationText || 'Not specified'}</span>
        </div>
      ),
      className: 'px-6 py-4'
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (event: EventListItem) => {
        const eventStatus = getEventStatus(event);
        const colors = {
          green: 'bg-green-100 text-green-800',
          blue: 'bg-blue-100 text-blue-800',
          gray: 'bg-gray-100 text-gray-800'
        };
        const colorClass = colors[eventStatus.color as keyof typeof colors];
        return (
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>
            {eventStatus.status}
          </span>
        );
      },
      className: 'px-6 py-4'
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (event: EventListItem) => (
        <RowActionsMenu actions={[
          { label: 'Edit', onClick: () => { setSelectedEvent(event); setShowEditModal(true); } },
          { label: 'Delete', onClick: () => { setEventToDelete(event); setShowDeleteConfirm(true); }, variant: 'danger' },
        ]} />
      ),
      className: 'px-6 py-4'
    },
  ];

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AdminLayout
      title="Events"
      description="Manage events for all community services"
    >
      <div className="space-y-6">
        {/* Table with custom header */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {/* Custom header with search, filters and button */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 block w-full sm:w-64 px-4 py-2 rounded-md border-gray-300 shadow-sm focus:ring-[#F5821F] focus:border-[#F5821F] text-sm bg-white"
                  />
                </div>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="block w-full sm:w-48 px-4 py-2 rounded-md border-gray-300 shadow-sm focus:ring-[#F5821F] focus:border-[#F5821F] text-sm bg-white"
                >
                  <option value="">All Services</option>
                  {services.map((service) => (
                    <option key={service._id} value={service._id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
              <PermissionGate permission="services.manage">
                <Button onClick={() => setShowCreateModal(true)} className="whitespace-nowrap" size="sm">
                  Add Event
                </Button>
              </PermissionGate>
            </div>
          </div>

          {/* Table content */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-4 py-5 text-center">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <CalendarIcon />
                </div>
                <p className="text-sm text-gray-500">
                  {events.length === 0 ? 'No events found' : 'No events match your search criteria'}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className={`${column.className} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEvents.map((event) => (
                    <tr key={event._id} className="transition-all duration-500 ease-out hover:scale-[1.01] hover:shadow-md hover:bg-gray-50 hover:z-10 relative">
                      {columns.map((column) => (
                        <td
                          key={`${event._id}-${column.key}`}
                          className={`${column.className} whitespace-nowrap text-sm text-gray-900`}
                        >
                          {column.accessor(event)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <EventModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onEventSaved={handleEventSaved}
        />
      )}

      {/* Edit Event Modal */}
      {showEditModal && selectedEvent && (
        <EventModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEvent(null);
          }}
          onEventSaved={handleEventSaved}
          event={selectedEvent}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && eventToDelete && (
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setEventToDelete(null);
          }}
          onConfirm={handleDeleteEvent}
          title="Delete Event"
          message={`Are you sure you want to delete "${eventToDelete.name}"? This action cannot be undone.`}
          confirmLabel="Delete Event"
          confirmButtonColor="red"
          icon={<TrashIcon className="h-6 w-6 text-red-600" />}
        />
      )}
    </AdminLayout>
  );
}