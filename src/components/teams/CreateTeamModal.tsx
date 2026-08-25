'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { toast } from '@/components/ui/use-toast';
import { teamTypeService, TeamType } from '@/lib/teamTypes';
import { usePermissions } from '@/contexts/HierarchicalPermissionContext';
import { ChurchService } from '@/lib/churchService';
import MediaLibraryModal from '../MediaLibraryModal';
import { MediaFile } from '@/lib/mediaService';
import { PhotoIcon, CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface CreateTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (teamData: {
    name: string;
    type: string;
    description?: string;
    location?: string;
    churchId?: string;
    bannerImage?: File | null;
    bannerMediaFile?: MediaFile | null;
    bannerAlt?: string;
    profileImage?: File | null;
    profileMediaFile?: MediaFile | null;
    profileAlt?: string;
  }) => Promise<void>;
  editTeam?: {
    _id: string;
    name: string;
    type?: string; // Legacy field
    category?: string; // New field
    description?: string;
    location?: string;
    churchId?: string | { _id: string; name: string; };
    banner?: {
      url: string | null;
      key: string | null;
      alt: string | null;
    };
    profilePhoto?: {
      url: string | null;
      key: string | null;
      alt: string | null;
    };
  } | null;
  mode?: 'create' | 'edit';
}

export function CreateTeamModal({ open, onOpenChange, onSubmit, editTeam, mode = 'create' }: CreateTeamModalProps) {
  const {} = usePermissions();
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    location: '',
    churchId: '',
  });
  
  // Banner image state - following church pattern
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerAlt, setBannerAlt] = useState('');
  const [selectedBannerMediaFile, setSelectedBannerMediaFile] = useState<MediaFile | null>(null);
  const [isBannerMediaLibraryOpen, setIsBannerMediaLibraryOpen] = useState(false);
  
  // Profile photo state - following church pattern
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileAlt, setProfileAlt] = useState('');
  const [selectedProfileMediaFile, setSelectedProfileMediaFile] = useState<MediaFile | null>(null);
  const [isProfileMediaLibraryOpen, setIsProfileMediaLibraryOpen] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [teamTypes, setTeamTypes] = useState<TeamType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [churches, setChurches] = useState<Array<{_id: string, name: string}>>([]);
  const [loadingChurches, setLoadingChurches] = useState(false);
  
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  const loadTeamTypes = useCallback(async () => {
    try {
      setLoadingTypes(true);
      
      // Get current user from auth token to use user-based endpoint
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Decode token to get user ID (simple JWT decode)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      const payload = JSON.parse(atob(tokenParts[1]));
      const userId = payload.userId;
      
      const response = await teamTypeService.getUserTeamTypes(userId, true);
      setTeamTypes(response.data || []);
      
      // If no team types exist, suggest initialization
      if (!response.data || response.data.length === 0) {
        toast({
          title: 'No Team Types Found',
          description: 'Contact your administrator to initialize default team types.',
          variant: 'destructive',
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load team types';
      toast({
        title: 'Error Loading Team Types',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingTypes(false);
    }
  }, []);

  const loadChurches = useCallback(async () => {
    try {
      setLoadingChurches(true);

      // The /api/churches endpoint paginates (max 100 per page), so fetch every
      // page and concatenate — otherwise the dropdown only shows the first page
      // and search can't find churches that were never loaded.
      const PAGE_SIZE = 100;
      const first = await ChurchService.getAllChurches({ limit: PAGE_SIZE, page: 1 });
      let allChurches = first.data || [];

      const totalPages = first.pagination?.totalPages || 1;
      if (totalPages > 1) {
        const rest = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            ChurchService.getAllChurches({ limit: PAGE_SIZE, page: i + 2 })
          )
        );
        allChurches = allChurches.concat(...rest.map((r) => r.data || []));
      }

      const churchesData = allChurches.map((church) => ({
        _id: church._id,
        name: church.name,
      }));

      setChurches(churchesData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load churches';
      console.error('Failed to load churches:', error);
      toast({
        title: 'Error Loading Churches',
        description: errorMessage,
        variant: 'destructive',
      });
      setChurches([]);
    } finally {
      setLoadingChurches(false);
    }
  }, []);

  // Load team types and churches when modal opens
  useEffect(() => {
    if (open) {
      loadTeamTypes();
      loadChurches();
    }
  }, [open, loadTeamTypes, loadChurches]);

  // Populate form for edit mode after data is loaded
  useEffect(() => {
    if (open && mode === 'edit' && editTeam && !loadingTypes && !loadingChurches) {
      const teamType = editTeam.category || editTeam.type || '';
      
      // Handle churchId - it could be a string ID or an object with _id
      let churchIdString = '';
      if (editTeam.churchId) {
        churchIdString = typeof editTeam.churchId === 'string' 
          ? editTeam.churchId 
          : editTeam.churchId._id;
      }
      
      console.log('Populating form for edit mode:', {
        name: editTeam.name,
        teamType,
        churchId: editTeam.churchId,
        churchIdString,
        editTeam,
        availableTeamTypes: teamTypes.map(t => ({ id: t._id, name: t.name })),
        availableChurches: churches.map(c => ({ id: c._id, name: c.name })),
        churchMatch: churches.find(c => c._id === churchIdString),
        selectedChurchId: churches.find(c => c._id === churchIdString)?._id || '',
        selectedChurchName: churches.find(c => c._id === churchIdString)?.name || 'Not found',
      });
      
      // Ensure exact string match for church selection
      const selectedChurchId = churches.find(c => c._id === churchIdString)?._id || '';
      
      setFormData({
        name: editTeam.name,
        type: teamType,
        description: editTeam.description || '',
        location: editTeam.location || '',
        churchId: selectedChurchId,
      });
      
      // Set banner preview if exists
      if (editTeam.banner?.url) {
        setBannerPreview(editTeam.banner.url);
        setBannerAlt(editTeam.banner.alt || '');
      }
      
      // Set profile photo preview if exists
      if (editTeam.profilePhoto?.url) {
        setProfilePreview(editTeam.profilePhoto.url);
        setProfileAlt(editTeam.profilePhoto.alt || '');
      }
    }
  }, [open, mode, editTeam, loadingTypes, loadingChurches, teamTypes, churches]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Team name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.type) {
      toast({
        title: 'Error',
        description: 'Team type is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.churchId) {
      toast({
        title: 'Error',
        description: 'Church is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        ...formData,
        description: formData.description.trim() || undefined,
        location: formData.location.trim() || undefined,
        churchId: formData.churchId,
        bannerImage,
        bannerMediaFile: selectedBannerMediaFile,
        bannerAlt,
        profileImage,
        profileMediaFile: selectedProfileMediaFile,
        profileAlt,
      });
      
      // Reset form
      setFormData({
        name: '',
        type: '',
        description: '',
        location: '',
        churchId: '',
      });
      
      // Reset banner state
      setBannerImage(null);
      setBannerPreview(null);
      setBannerAlt('');
      setSelectedBannerMediaFile(null);
      setIsBannerMediaLibraryOpen(false);
      
      // Reset profile state
      setProfileImage(null);
      setProfilePreview(null);
      setProfileAlt('');
      setSelectedProfileMediaFile(null);
      setIsProfileMediaLibraryOpen(false);
      
      onOpenChange(false);
    } catch {
      // Error is handled in parent
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form to empty state (will be repopulated by useEffect if editing)
    setFormData({
      name: '',
      type: '',
      description: '',
      location: '',
      churchId: '',
    });
    
    // Reset banner state
    setBannerImage(null);
    setBannerPreview(null);
    setBannerAlt('');
    setSelectedBannerMediaFile(null);
    setIsBannerMediaLibraryOpen(false);
    
    // Reset profile state
    setProfileImage(null);
    setProfilePreview(null);
    setProfileAlt('');
    setSelectedProfileMediaFile(null);
    setIsProfileMediaLibraryOpen(false);
    
    onOpenChange(false);
  };

  // Banner image handling functions - following church pattern
  const handleBannerImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: 'Please select an image file (JPEG, PNG, WebP).',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Banner image must be smaller than 2MB.',
          variant: 'destructive',
        });
        return;
      }

      setBannerImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setBannerPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBannerImage = () => {
    setBannerImage(null);
    setSelectedBannerMediaFile(null);
    setBannerPreview(null);
    setBannerAlt('');
    if (bannerFileInputRef.current) {
      bannerFileInputRef.current.value = '';
    }
  };

  const handleBannerMediaSelect = (mediaFile: MediaFile) => {
    setSelectedBannerMediaFile(mediaFile);
    setBannerPreview(mediaFile.url);
    setBannerAlt(mediaFile.alt);
    setBannerImage(null); // Clear any previously selected file
    setIsBannerMediaLibraryOpen(false);
  };

  const openBannerMediaLibrary = () => {
    setIsBannerMediaLibraryOpen(true);
  };

  // Profile photo handling functions - following church pattern
  const handleProfileImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: 'Please select an image file (JPEG, PNG, WebP).',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Profile photo must be smaller than 2MB.',
          variant: 'destructive',
        });
        return;
      }

      setProfileImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfileImage = () => {
    setProfileImage(null);
    setSelectedProfileMediaFile(null);
    setProfilePreview(null);
    setProfileAlt('');
    if (profileFileInputRef.current) {
      profileFileInputRef.current.value = '';
    }
  };

  const handleProfileMediaSelect = (mediaFile: MediaFile) => {
    setSelectedProfileMediaFile(mediaFile);
    setProfilePreview(mediaFile.url);
    setProfileAlt(mediaFile.alt);
    setProfileImage(null); // Clear any previously selected file
    setIsProfileMediaLibraryOpen(false);
  };

  const openProfileMediaLibrary = () => {
    setIsProfileMediaLibraryOpen(true);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Team' : 'Create New Team'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Edit the team details below' : 'Create a new team for your organization'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid gap-4 py-4">
            
            <div className="grid gap-2">
              <Label htmlFor="name">Team Name*</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter team name"
                disabled={loading}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="type">Team Type*</Label>
              <Select
                value={formData.type}
                onValueChange={(value: string) => 
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue 
                    placeholder={
                      loadingTypes 
                        ? "Loading types..." 
                        : teamTypes.length === 0 
                          ? "No team types available" 
                          : "Choose team type"
                    } 
                  />
                </SelectTrigger>
                <SelectContent>
                  {teamTypes.length === 0 && !loadingTypes ? (
                    <SelectItem value="" disabled>
                      <div className="flex items-center gap-2 text-gray-500">
                        <span>⚠️</span>
                        <div>No team types found. Contact your administrator.</div>
                      </div>
                    </SelectItem>
                  ) : (
                    teamTypes.map((teamType) => (
                      <SelectItem key={teamType._id} value={teamType.name}>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                            📋
                          </span>
                          <div>
                            <div className="font-medium">{teamType.name}</div>
                            {teamType.description && (
                              <div className="text-xs text-gray-500">{teamType.description}</div>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="church">Church*</Label>
              <Combobox
                options={churches.map((church) => ({ value: church._id, label: church.name }))}
                value={formData.churchId}
                onChange={(value: string) => {
                  setFormData({ ...formData, churchId: value });
                }}
                disabled={loadingChurches || churches.length === 0}
                placeholder={
                  loadingChurches
                    ? 'Loading churches...'
                    : churches.length === 0
                      ? 'No churches available'
                      : 'Select church'
                }
                searchPlaceholder="Search churches..."
                emptyText="No churches found. Contact your administrator."
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter team description (optional)"
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter team location (optional)"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Where does your team operate or meet?
              </p>
            </div>
            

            {/* Banner Upload - Church Style */}
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-gray-900">Team Banner</Label>
              
              {bannerPreview ? (
                <div className="relative">
                  {/* `relative` is required: next/image `fill` positions against the
                      nearest positioned ancestor, so without it the preview escaped to
                      the wrapper above and rendered an arbitrary crop. 3:1 is the ratio
                      of the recommended 1200x400, so a correct banner previews whole. */}
                  <div className="relative w-full aspect-[3/1] bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={bannerPreview}
                      alt="Banner preview"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={removeBannerImage}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                  <div className="mt-2">
                    <Label className="block text-sm font-medium text-gray-700">
                      Alt Text
                    </Label>
                    <Input
                      type="text"
                      value={bannerAlt}
                      onChange={(e) => setBannerAlt(e.target.value)}
                      placeholder="Describe the banner image for accessibility"
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Button
                      type="button"
                      onClick={openBannerMediaLibrary}
                      variant="outline"
                      className="inline-flex items-center"
                    >
                      <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                      Select Banner Image
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Browse existing images or upload new ones. Recommended size: 1200x400px
                  </p>
                </div>
              )}
              
              <input
                ref={bannerFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerImageUpload}
                className="hidden"
              />
            </div>

            {/* Profile Photo Upload - Church Style */}
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-gray-900">Team Profile Photo</Label>
              
              {profilePreview ? (
                <div className="relative">
                  {/* Same `fill` fix as the banner above. The square is already right
                      for the recommended 400x400, so only the positioning was wrong. */}
                  <div className="relative w-32 h-32 bg-gray-100 rounded-full overflow-hidden mx-auto">
                    <Image
                      src={profilePreview}
                      alt="Profile preview"
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={removeProfileImage}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                  <div className="mt-2">
                    <Label className="block text-sm font-medium text-gray-700">
                      Alt Text
                    </Label>
                    <Input
                      type="text"
                      value={profileAlt}
                      onChange={(e) => setProfileAlt(e.target.value)}
                      placeholder="Describe the profile photo for accessibility"
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Button
                      type="button"
                      onClick={openProfileMediaLibrary}
                      variant="outline"
                      className="inline-flex items-center"
                    >
                      <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                      Select Profile Photo
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Browse existing images or upload new ones. Recommended size: 400x400px
                  </p>
                </div>
              )}
              
              <input
                ref={profileFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfileImageUpload}
                className="hidden"
              />
            </div>
          </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (mode === 'edit' ? 'Updating...' : 'Creating...') : (mode === 'edit' ? 'Update Team' : 'Create Team')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Banner Media Library Modal */}
    <MediaLibraryModal
      isOpen={isBannerMediaLibraryOpen}
      onClose={() => setIsBannerMediaLibraryOpen(false)}
      onSelect={handleBannerMediaSelect}
      title="Select Banner Image"
      allowedTypes={['banner', 'gallery']}
      category="team"
      type="banner"
    />

    {/* Profile Photo Media Library Modal */}
    <MediaLibraryModal
      isOpen={isProfileMediaLibraryOpen}
      onClose={() => setIsProfileMediaLibraryOpen(false)}
      onSelect={handleProfileMediaSelect}
      title="Select Profile Photo"
      allowedTypes={['banner', 'gallery', 'avatar']}
      category="team"
      type="avatar"
    />
  </>
  );
}