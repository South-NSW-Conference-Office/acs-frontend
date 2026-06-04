'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal, { ModalBody, ModalFooter } from './Modal';
import Button from './Button';
import { useToast } from '@/contexts/ToastContext';
import { eventsAPI, EventListItem, EventCreateRequest } from '@/lib/eventsAPI';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventSaved: () => void;
  event?: EventListItem;
}

export default function EventModal({ isOpen, onClose, onEventSaved, event }: EventModalProps) {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Array<{ _id: string; name: string; type: string }>>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    endTime: '',
    location: '',
    capacity: '',
    serviceId: ''
  });

  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const fetchServices = useCallback(async () => {
    try {
      const servicesData = await eventsAPI.getServicesForDropdown();
      setServices(servicesData || []);
    } catch (error) {
      console.error('Failed to fetch services:', error);
      // Only show error toast if it's a real error, not when services array is empty
      if (error && error instanceof Error && error.message !== 'No services found') {
        showErrorToast('Failed to load services');
      }
    }
  }, [showErrorToast]);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      if (event) {
        // Editing existing event
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        
        setFormData({
          name: event.name,
          description: event.description || '',
          date: startDate.toISOString().split('T')[0],
          time: startDate.toTimeString().substr(0, 5),
          endTime: endDate.toTimeString().substr(0, 5),
          location: event.locationText || '',
          capacity: event.capacity?.maximum?.toString() || '',
          serviceId: event.service._id
        });
      } else {
        // Creating new event
        setFormData({
          name: '',
          description: '',
          date: '',
          time: '',
          endTime: '',
          location: '',
          capacity: '',
          serviceId: ''
        });
      }
      
      // Fetch services for dropdown
      fetchServices();
    }
  }, [isOpen, event, fetchServices]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      date: '',
      time: '',
      endTime: '',
      location: '',
      capacity: '',
      serviceId: ''
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.date || !formData.serviceId || !formData.description.trim() || !formData.location.trim()) {
      showErrorToast('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // Create start date
      const start = new Date(formData.date);
      if (formData.time) {
        const [hours, minutes] = formData.time.split(':');
        start.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      }
      
      // Create end date
      let end = new Date(formData.date);
      if (formData.endTime) {
        const [hours, minutes] = formData.endTime.split(':');
        end.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      } else {
        // Default to 1 hour after start if no end time specified
        end = new Date(start);
        end.setHours(end.getHours() + 1);
      }

      const eventData: EventCreateRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        start: start.toISOString(),
        end: end.toISOString(),
        locationText: formData.location.trim() || undefined,
        serviceId: formData.serviceId,
        capacity: formData.capacity ? { maximum: parseInt(formData.capacity) } : undefined
      };

      if (event) {
        await eventsAPI.updateEvent(event._id, eventData);
        showSuccessToast('Event updated successfully');
      } else {
        await eventsAPI.createEvent(eventData);
        showSuccessToast('Event created successfully');
      }

      resetForm();
      onEventSaved();
    } catch (error) {
      console.error('Failed to save event:', error);
      showErrorToast(`Failed to save event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={event ? "Edit Event" : "Create Event"} maxWidth="2xl" removeBorder={true}>
      <ModalBody>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Event Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter event title"
                  required
                />
              </div>

              {/* Service Selection */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Service *
                </label>
                <select
                  value={formData.serviceId}
                  onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                  disabled={!!event} // Disable when editing
                >
                  <option value="">Select a service</option>
                  {services.map((service) => (
                    <option key={service._id} value={service._id}>
                      {service.name} - {service.type}
                    </option>
                  ))}
                </select>
                {event && (
                  <p className="mt-1 text-xs text-gray-500">
                    Service cannot be changed when editing an event
                  </p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Start Time
                </label>
                <select
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select start time (optional)</option>
                  <option value="06:00">6:00 AM</option>
                  <option value="06:30">6:30 AM</option>
                  <option value="07:00">7:00 AM</option>
                  <option value="07:30">7:30 AM</option>
                  <option value="08:00">8:00 AM</option>
                  <option value="08:30">8:30 AM</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="09:30">9:30 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="11:30">11:30 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="12:30">12:30 PM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="13:30">1:30 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="14:30">2:30 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="15:30">3:30 PM</option>
                  <option value="16:00">4:00 PM</option>
                  <option value="16:30">4:30 PM</option>
                  <option value="17:00">5:00 PM</option>
                  <option value="17:30">5:30 PM</option>
                  <option value="18:00">6:00 PM</option>
                  <option value="18:30">6:30 PM</option>
                  <option value="19:00">7:00 PM</option>
                  <option value="19:30">7:30 PM</option>
                  <option value="20:00">8:00 PM</option>
                  <option value="20:30">8:30 PM</option>
                  <option value="21:00">9:00 PM</option>
                </select>
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  End Time
                </label>
                <select
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select end time (optional)</option>
                  <option value="06:30">6:30 AM</option>
                  <option value="07:00">7:00 AM</option>
                  <option value="07:30">7:30 AM</option>
                  <option value="08:00">8:00 AM</option>
                  <option value="08:30">8:30 AM</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="09:30">9:30 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="11:30">11:30 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="12:30">12:30 PM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="13:30">1:30 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="14:30">2:30 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="15:30">3:30 PM</option>
                  <option value="16:00">4:00 PM</option>
                  <option value="16:30">4:30 PM</option>
                  <option value="17:00">5:00 PM</option>
                  <option value="17:30">5:30 PM</option>
                  <option value="18:00">6:00 PM</option>
                  <option value="18:30">6:30 PM</option>
                  <option value="19:00">7:00 PM</option>
                  <option value="19:30">7:30 PM</option>
                  <option value="20:00">8:00 PM</option>
                  <option value="20:30">8:30 PM</option>
                  <option value="21:00">9:00 PM</option>
                  <option value="21:30">9:30 PM</option>
                  <option value="22:00">10:00 PM</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter event location"
                />
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Capacity
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Maximum attendees"
                  min="1"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter event description"
                />
              </div>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={loading || !formData.name.trim() || !formData.date || !formData.serviceId || !formData.description.trim() || !formData.location.trim()}>
            {loading ? 'Saving...' : (event ? 'Update Event' : 'Create Event')}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}